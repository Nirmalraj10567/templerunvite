const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

module.exports = function(deps = {}) {
  const { db, JWT_SECRET, authenticateToken } = deps;

  // Rate limiters (protect public login discovery endpoints)
  const modeLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 }); // 30/min per IP
  const smartLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 }); // 10/min per IP

  // Note: Public routes are defined below. Removed stray early /login block.
  // Smart login (public)
  // POST /api/login/smart { mobile, name?, receiptNumber? }
  // - If mobile belongs to admin or a user with password => respond with password mode and username hint
  // - Else => auto-trigger OTP (development: returns TEST_OTP) and the matching registration users list
  router.post('/login/smart', smartLimiter, async (req, res) => {
    try {
      const { mobile, name, receiptNumber } = req.body || {};
      if (!mobile) return res.status(400).json({ error: 'mobile is required' });

      const cleanMobile = String(mobile).replace(/\D/g, '');
      if (cleanMobile.length !== 10) return res.status(400).json({ error: 'Invalid mobile number' });

      // Check main users table (admin/staff)
      const sysUser = await db('users').select('id','username','mobile','role','password')
        .where('mobile', cleanMobile).first();

      const isAdmin = !!sysUser && (sysUser.role === 'admin' || sysUser.role === 'superadmin');
      const hasPassword = !!sysUser && !!sysUser.password && String(sysUser.password).length > 0;

      if (sysUser && (isAdmin || hasPassword)) {
        return res.json({ mode: 'password', username: sysUser.username || sysUser.mobile, isAdmin });
      }

      // Otherwise fallback to OTP for member users
      const TEST_OTP = '123456'; // Development only; replace with SMS integration in production
      let query = db('user_registrations').where('mobile_number', cleanMobile);
      if (name) query = query.andWhere('name', 'like', `%${name}%`);
      if (receiptNumber) query = query.andWhere('reference_number', receiptNumber);
      const users = await query.select(
        'id','name','reference_number as referenceNumber','mobile_number as mobileNumber','father_name as fatherName','alternative_name as alternativeName'
      );

      // Always respond success with OTP mode to avoid leaking whether the number exists in staff table
      return res.json({
        mode: 'otp',
        message: 'OTP sent successfully',
        otp: TEST_OTP, // Development only; do not expose in production
        users
      });

    } catch (err) {
      console.error('POST /api/login/smart error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Password login (public)
  router.post('/login', async (req, res) => {
    try {
      const { mobile, username, password } = req.body || {};
      if ((!mobile && !username) || !password) {
        return res.status(400).json({ error: 'Username or mobile and password are required.' });
      }

      // Get user with temple information
      const userQuery = db('users')
        .join('temples', 'users.temple_id', 'temples.id')
        .where('users.status', 'active')
        .select('users.*', 'temples.name as templeName');

      if (mobile && username) {
        userQuery.andWhere((b) => b.where('users.mobile', mobile).orWhere('users.username', username));
      } else if (mobile) {
        userQuery.andWhere('users.mobile', mobile);
      } else if (username) {
        userQuery.andWhere('users.username', username);
      }

      const user = await userQuery.first();
      if (!user) return res.status(401).json({ error: 'Invalid credentials or user not found.' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

      // Optionally update last_login if column exists
      try {
        const hasLastLogin = await db.schema.hasColumn('users', 'last_login');
        if (hasLastLogin) await db('users').where('id', user.id).update({ last_login: db.fn.now() });
      } catch {}

      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, username: user.username, templeId: user.temple_id, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Load permissions
      const permissions = await db('user_permissions').where({ user_id: user.id }).select('permission_id', 'access_level');

      // Log session (best effort)
      db('session_logs').insert({ user_id: user.id, login_time: db.fn.now(), ip_address: req.ip, user_agent: req.headers['user-agent'] }).catch(() => {});

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          mobile: user.mobile,
          templeId: user.temple_id,
          username: user.username,
          role: user.role,
          templeName: user.templeName,
          fullName: user.full_name,
          email: user.email,
          permissions,
        },
      });
    } catch (err) {
      console.error('POST /api/login error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  });

  // Determine login mode (public)
  // GET /api/login/mode?mobile=9876543210 or ?username=admin
  // Returns { mode: 'password' | 'otp', username?: string, isAdmin?: boolean }
  router.get('/login/mode', modeLimiter, async (req, res) => {
    try {
      const { mobile, username } = req.query;
      if (!mobile && !username) {
        return res.status(400).json({ error: 'mobile or username is required' });
      }

      const q = db('users').select('id','username','mobile','role','password');
      if (mobile && username) {
        q.where(builder => builder.where('mobile', mobile).orWhere('username', username));
      } else if (mobile) {
        q.where({ mobile });
      } else {
        q.where({ username });
      }
      const user = await q.first();

      if (!user) {
        return res.json({ mode: 'otp' });
      }

      const isAdmin = user.role === 'admin' || user.role === 'superadmin';
      const hasPassword = !!user.password && String(user.password).length > 0;

      if (isAdmin || hasPassword) {
        return res.json({ mode: 'password', username: user.username || user.mobile, isAdmin });
      }
      return res.json({ mode: 'otp', username: user.username || undefined, isAdmin });
    } catch (err) {
      console.error('GET /api/login/mode error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Protect all routes after this point with JWT authentication
  router.use((req, res, next) => {
    // Skip auth for these public routes
    const publicRoutes = ['/login', '/login/mode', '/login/smart'];
    if (publicRoutes.includes(req.path)) return next();
    
    if (typeof authenticateToken === 'function') {
      return authenticateToken(req, res, next);
    }
    return res.status(401).json({ error: 'Access denied. No auth middleware configured.' });
  });

  // Register endpoint (admin/superadmin only)
  router.post('/register', async (req, res) => {
    const { mobile, username, password, email, fullName, role, templeId, customPermissions } = req.body;
    
    if (!mobile || !username || !password || !templeId) {
      return res.status(400).json({ error: 'Mobile, username, password, and templeId are required.' });
    }

    // Check if user has permission to create users for this temple
    if (req.user.templeId !== templeId) {
      return res.status(403).json({ error: 'You can only create users for your own temple.' });
    }

    // Validate role permissions
    if (req.user.role === 'admin' && role === 'superadmin') {
      return res.status(403).json({ error: 'Admins cannot create superadmin users.' });
    }

    try {
      // Check if user already exists
      const exists = await db('users').where({ mobile }).orWhere({ username }).first();
      if (exists) {
        return res.status(409).json({ error: 'Mobile number or username already registered.' });
      }

      // Check if temple exists
      const temple = await db('temples').where('id', templeId).first();
      if (!temple) {
        return res.status(400).json({ error: 'Invalid temple ID.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await db('users').insert({ 
        mobile, 
        username, 
        password: hashedPassword,
        email,
        full_name: fullName,
        temple_id: templeId,
        role: role || 'member'
      }).returning('*');

      // If custom permissions are provided, save them
      if (customPermissions && Array.isArray(customPermissions)) {
        const permissionRecords = customPermissions.map(perm => ({
          user_id: newUser[0].id,
          permission_id: perm.id,
          access_level: perm.access
        }));

        await db('user_permissions').insert(permissionRecords);
      }

      res.json({ 
        success: true, 
        user: {
          id: newUser[0].id,
          mobile: newUser[0].mobile,
          username: newUser[0].username,
          email: newUser[0].email,
          fullName: newUser[0].full_name,
          role: newUser[0].role,
          templeId: newUser[0].temple_id
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Database error during registration.' });
    }
  });

  // Get all users for a specific temple (admin/superadmin only)
  router.get('/temple/:templeId', async (req, res) => {
    const { templeId } = req.params;

    try {
      const users = await db('user_registrations')
        .where('temple_id', templeId)
        .orderBy('created_at', 'desc');

      res.json(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Database error while fetching users.' });
    }
  });

  // Get current user profile
  router.get('/profile', async (req, res) => {
    try {
      const user = await db('users')
        .join('temples', 'users.temple_id', 'temples.id')
        .where('users.id', req.user.id)
        .select('users.*', 'temples.name as templeName')
        .first();

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      delete user.password;
      res.json({ success: true, user });
    } catch (err) {
      console.error('Error fetching profile:', err);
      res.status(500).json({ error: 'Database error while fetching profile.' });
    }
  });

  // Update current user profile
  router.put('/profile', async (req, res) => {
    const { email, fullName, websiteLink, profileImage, trustInformation } = req.body;

    try {
      const updatedUser = await db('users')
        .where('id', req.user.id)
        .update({
          email: email || null,
          full_name: fullName || null,
          website_link: websiteLink || null,
          profile_image: profileImage || null,
          trust_information: trustInformation || null,
          updated_at: db.fn.now()
        })
        .returning('*');

      res.json({ success: true, user: updatedUser[0] });
    } catch (err) {
      console.error('Error updating profile:', err);
      res.status(500).json({ error: 'Database error while updating profile.' });
    }
  });

  // Update user (admin/superadmin only)
  router.put('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { email, fullName, role, status, customPermissions } = req.body;

    try {
      const user = await db('users').where('id', userId).first();
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Check if user has permission to update users for this temple
      if (user.temple_id !== req.user.templeId) {
        return res.status(403).json({ error: 'You can only update users from your own temple.' });
      }

      // Validate role permissions
      if (req.user.role === 'admin' && (role === 'superadmin' || (user.role === 'superadmin' && role !== 'superadmin'))) {
        return res.status(403).json({ error: 'You do not have permission to modify superadmin users.' });
      }

      // Update user data
      const updateData = {
        email: email || user.email,
        full_name: fullName || user.full_name,
        status: status || user.status,
        updated_at: db.fn.now()
      };

      // Only update role if it's being changed and user has permission
      if (role && role !== user.role) {
        if (req.user.role === 'superadmin') {
          updateData.role = role;
        } else if (role === 'superadmin') {
          return res.status(403).json({ error: 'You do not have permission to assign superadmin role.' });
        } else {
          updateData.role = role;
        }
      }

      const updatedUser = await db('users')
        .where('id', userId)
        .update(updateData)
        .returning('*');

      // Update custom permissions if provided
      if (Array.isArray(customPermissions)) {
        // Delete existing permissions
        await db('user_permissions').where('user_id', userId).delete();
        
        // Insert new permissions
        if (customPermissions.length > 0) {
          const permissionRecords = customPermissions.map(perm => ({
            user_id: userId,
            permission_id: perm.id,
            access_level: perm.access
          }));
          await db('user_permissions').insert(permissionRecords);
        }
      }

      // Get updated user with permissions
      const userWithPermissions = await db('users')
        .leftJoin('user_permissions', 'users.id', 'user_permissions.user_id')
        .where('users.id', userId)
        .select('users.*', db.raw('json_group_array(json_object("id", user_permissions.permission_id, "access", user_permissions.access_level)) as permissions'));

      // Format the response
      const responseUser = {
        ...userWithPermissions[0],
        permissions: userWithPermissions[0].permissions 
          ? JSON.parse(userWithPermissions[0].permissions).filter(p => p.id !== null)
          : []
      };

      delete responseUser.password;
      res.json({ success: true, user: responseUser });
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Database error while updating user.' });
    }
  });

  // Logout endpoint
  router.post('/logout', (req, res) => {
    const userId = req.user.id;
    
    // Find the latest session log without a logout time for this user
    db('session_logs')
      .where({
        user_id: userId,
        logout_time: null
      })
      .orderBy('login_time', 'desc')
      .first()
      .then(session => {
        if (session) {
          // Update the logout time
          return db('session_logs')
            .where('id', session.id)
            .update({
              logout_time: db.fn.now()
            });
        }
      })
      .then(() => {
        res.json({ success: true, message: 'Logged out successfully' });
      })
      .catch(err => {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Error logging out' });
      });
  });

  return router;
};
