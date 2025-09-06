const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = function(deps = {}) {
  const { db, JWT_SECRET } = deps;

  // Login endpoint with rate limiting
  router.post('/login', async (req, res) => {
    const { mobile, username, password } = req.body;

    // Accept either username or mobile along with password
    if ((!mobile && !username) || !password) {
      return res.status(400).json({ 
        error: "Username or mobile and password are required."
      });
    }

    try {
      // Get user with temple information
      const userQuery = db('users')
        .join('temples', 'users.temple_id', 'temples.id')
        .where('users.status', 'active')
        .select('users.*', 'temples.name as templeName');

      // If both provided, match either. If one provided, match that one.
      if (mobile && username) {
        userQuery.andWhere(builder => builder.where('users.mobile', mobile).orWhere('users.username', username));
      } else if (mobile) {
        userQuery.andWhere('users.mobile', mobile);
      } else if (username) {
        userQuery.andWhere('users.username', username);
      }

      const user = await userQuery.first();

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials or user not found.' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Update last login (only if column exists)
      try {
        const hasLastLogin = await db.schema.hasColumn('users', 'last_login');
        if (hasLastLogin) {
          await db('users').where('id', user.id).update({ last_login: db.fn.now() });
        }
      } catch (e) {
        // Ignore if schema APIs are unavailable or column missing
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          mobile: user.mobile, 
          username: user.username, 
          templeId: user.temple_id,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Load user permissions to support frontend permission guard
      const permissions = await db('user_permissions')
        .where({ user_id: user.id })
        .select('permission_id', 'access_level');

      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      // Insert session log for login
      db('session_logs').insert({
        user_id: user.id,
        login_time: db.fn.now(),
        ip_address: ipAddress,
        user_agent: userAgent
      }).then(() => {
        console.log(`Logged login for user ${user.id}`);
      }).catch(err => {
        console.error('Error logging session:', err);
      });

      res.json({ 
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
          permissions
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
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
