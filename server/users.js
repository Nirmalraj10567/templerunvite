const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const sendOtp = require('./sendOtp'); // Import the SMS OTP service

module.exports = function (deps = {}) {
  const { db, JWT_SECRET, authenticateToken } = deps;

  // Rate limiters (protect public login discovery endpoints)
  const modeLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 }); // 30/min per IP
  const smartLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 }); // 10/min per IP

  // Note: Public routes are defined below. Removed stray early /login block.
  // In-memory OTP storage (consider using Redis in production)
  const otpStore = new Map();

  // Generate 6-digit OTP
  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Clean up expired OTPs every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [mobile, data] of otpStore.entries()) {
      if (now > data.expiry) {
        otpStore.delete(mobile);
      }
    }
  }, 10 * 60 * 1000);

  // Smart login (public)
  // POST /api/login/smart { mobile, name?, receiptNumber? }
  // - If mobile belongs to admin or a user with password => respond with password mode and username hint
  // - Else => auto-trigger OTP and the matching registration users list
  router.post('/login/smart', smartLimiter, async (req, res) => {
    try {
      const { mobile, name, receiptNumber } = req.body || {};
      if (!mobile) return res.status(400).json({ error: 'mobile is required' });

      const cleanMobile = String(mobile).replace(/\D/g, '');
      if (cleanMobile.length !== 10) return res.status(400).json({ error: 'Invalid mobile number' });

      // Check main users table (admin/staff)
      const sysUser = await db('users').select('id', 'username', 'mobile', 'role', 'password')
        .where('mobile', cleanMobile).first();

      const isAdmin = !!sysUser && (sysUser.role === 'admin' || sysUser.role === 'superadmin');
      const hasPassword = !!sysUser && !!sysUser.password && String(sysUser.password).length > 0;

      if (sysUser && (isAdmin || hasPassword)) {
        return res.json({ mode: 'password', username: sysUser.username || sysUser.mobile, isAdmin });
      }

      // Generate and send OTP for member users
      const otp = generateOtp();
      const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

      // Store OTP with expiry
      otpStore.set(cleanMobile, { otp, expiry: otpExpiry });

      // Send OTP via SMS
      const smsResult = await sendOtp(cleanMobile, otp);
      if (!smsResult.success) {
        console.error('Failed to send OTP:', smsResult.error);
        return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
      }

      // Get matching users from registrations
      let query = db('user_registrations').where('mobile_number', cleanMobile);
      if (name) query = query.andWhere('name', 'like', `%${name}%`);
      if (receiptNumber) query = query.andWhere('reference_number', receiptNumber);
      const users = await query.select(
        'id', 'name', 'reference_number as referenceNumber', 'mobile_number as mobileNumber', 'father_name as fatherName', 'alternative_name as alternativeName'
      );

      // Always respond success with OTP mode to avoid leaking whether the number exists in staff table
      return res.json({
        mode: 'otp',
        message: 'OTP sent successfully',
        users
      });

    } catch (err) {
      console.error('POST /api/login/smart error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // OTP verification and login (public)
  router.post('/login/otp', async (req, res) => {
    try {
      const { mobile, otp, userId } = req.body || {};
      if (!mobile || !otp) {
        return res.status(400).json({ error: 'Mobile and OTP are required' });
      }

      const cleanMobile = String(mobile).replace(/\D/g, '');

      // Check if OTP exists and is valid
      const storedOtpData = otpStore.get(cleanMobile);
      if (!storedOtpData) {
        return res.status(400).json({ error: 'OTP not found or expired' });
      }

      if (Date.now() > storedOtpData.expiry) {
        otpStore.delete(cleanMobile);
        return res.status(400).json({ error: 'OTP has expired' });
      }

      if (storedOtpData.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // OTP is valid, remove it from store
      otpStore.delete(cleanMobile);

      // Get user information
      let user;
      if (userId) {
        // Get specific user from registrations
        user = await db('user_registrations')
          .where('id', userId)
          .andWhere('mobile_number', cleanMobile)
          .first();

        if (!user) {
          return res.status(404).json({ error: 'User not found with provided ID' });
        }
      } else {
        // Get first user with this mobile number
        user = await db('user_registrations')
          .where('mobile_number', cleanMobile)
          .first();

        if (!user) {
          return res.status(404).json({ error: 'No user found with this mobile number' });
        }
      }

      // Resolve templeId from registrations if available (fallback to 1)
      let templeId = null;
      try {
        const hasTempleIdCol = await db.schema.hasColumn('user_registrations', 'temple_id');
        if (hasTempleIdCol && user && Object.prototype.hasOwnProperty.call(user, 'temple_id')) {
          const tId = Number(user.temple_id);
          if (Number.isFinite(tId) && tId > 0) templeId = tId;
        }
      } catch {}
      if (!templeId) templeId = 1;

      // Create JWT token for member user (include templeId)
      const token = jwt.sign(
        {
          id: user.id,
          mobile: user.mobile_number,
          name: user.name,
          type: 'member',
          referenceNumber: user.reference_number,
          templeId: templeId
        },
        JWT_SECRET,
        { expiresIn: '365d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile_number,
          referenceNumber: user.reference_number,
          fatherName: user.father_name,
          alternativeName: user.alternative_name,
          type: 'member',
          templeId: templeId
        }
      });

    } catch (err) {
      console.error('POST /api/login/otp error:', err);
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
      } catch { }

      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, username: user.username, templeId: user.temple_id, role: user.role },
        JWT_SECRET,
        { expiresIn: '365d' }
      );

      // Load permissions and normalize to { id, access }
      const permissions = await db('user_permissions')
        .where({ user_id: user.id })
        .select('permission_id', 'access_level');
      const permissionsMapped = permissions.map(p => ({ id: p.permission_id, access: p.access_level }));
      try { console.log(`[LOGIN] user ${user.id} permissions count:`, permissionsMapped.length); } catch { }

      // Log session (best effort)
      db('session_logs').insert({ user_id: user.id, login_time: db.fn.now(), ip_address: req.ip, user_agent: req.headers['user-agent'] }).catch(() => { });

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
          permissions: permissionsMapped,
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

      const q = db('users').select('id', 'username', 'mobile', 'role', 'password');
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
    const publicRoutes = ['/login', '/login/mode', '/login/smart', '/login/otp', '/register'];
    if (publicRoutes.includes(req.path)) return next();

    if (typeof authenticateToken === 'function') {
      return authenticateToken(req, res, next);
    }
    return res.status(401).json({ error: 'Access denied. No auth middleware configured.' });
  });

  // Register endpoint
  // Public self-registration: creates a new temple automatically when unauthenticated and no templeId provided
  // Authenticated admin/superadmin: can create users under their own temple
  router.post('/register', async (req, res) => {
    const {
      mobile,
      username,
      password,
      email,
      fullName,
      role,
      templeId: bodyTempleId,
      customPermissions,
      // Extra fields from public RegisterPage (ignored/stored later if needed)
      websiteLink,
      isTrust,
      trustType,
      trustRegistrationNumber,
      dateOfRegistration,
      panNumber,
      tanNumber,
      gstNumber,
      reg12A,
      reg80G,
    } = req.body || {};

    if (!mobile || !username || !password) {
      return res.status(400).json({ error: 'Mobile, username, and password are required.' });
    }

    let resolvedTempleId = bodyTempleId;

    try {
      // If authenticated, enforce temple scope; else create a new temple if none provided
      if (req.user && req.user.id) {
        if (!resolvedTempleId) {
          resolvedTempleId = req.user.templeId;
        }
        if (resolvedTempleId !== req.user.templeId) {
          return res.status(403).json({ error: 'You can only create users for your own temple.' });
        }
        if (req.user.role === 'admin' && role === 'superadmin') {
          return res.status(403).json({ error: 'Admins cannot create superadmin users.' });
        }
      } else {
        // Public self-registration path
        if (!resolvedTempleId) {
          // Auto-create a temple with minimal required fields compatible with MySQL schema
          const templeName = (fullName && String(fullName).trim()) || `Temple ${String(mobile).trim()}`;
          // Insert only existing columns in temples schema
          const [newTempleId] = await db('temples').insert({
            name: templeName,
            address: 'N/A',
          });
          resolvedTempleId = newTempleId;
        }
      }

      // Check if user already exists
      const exists = await db('users')
        .where({ mobile })
        .orWhere({ username })
        .first();
      if (exists) {
        return res.status(409).json({ error: 'Mobile number or username already registered.' });
      }

      // Ensure temple exists (for both paths)
      const temple = await db('temples').where('id', resolvedTempleId).first();
      if (!temple) {
        return res.status(400).json({ error: 'Invalid temple ID.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const defaultRole = req.user && req.user.id ? (role || 'member') : 'admin';

      const safeFullName = (fullName && String(fullName).trim()) || String(username).trim();
      let safeEmail = (email && String(email).trim()) || `${String(username).trim()}@generated.local`;
      // Ensure email uniqueness for MySQL schema (NOT NULL UNIQUE)
      const emailExists = await db('users').where({ email: safeEmail }).first();
      if (emailExists) {
        const base = String(username).trim() || 'user';
        safeEmail = `${base}+${Date.now()}@generated.local`;
      }

      const [insertId] = await db('users').insert({
        mobile,
        username,
        password: hashedPassword,
        email: safeEmail,
        full_name: safeFullName,
        temple_id: resolvedTempleId,
        role: defaultRole,
        // created_at/updated_at have defaults in schema
      });

      const createdUser = await db('users').where({ id: insertId }).first();

      // Grant ALL permissions (full) to newly registered user
      const ALL_PERMISSION_IDS = [
        'dashboard',
        'member_entry',
        'master_data',
        'balance_sheet',
        'ledger_management',
        'transaction',
        'report', // legacy singular
        'reports', // frontend uses plural
        'setting',
        'pdf_settings',
        'property_registrations',
        'view_donations',
        'edit_donations',
        'receipts',
        'donation_approval',
        'session_logs',
        'view_session_logs',
        'activity_logs',
        'tax_registrations',
        "marriage_register",
        'user_registrations',
        'pooja_registrations',
        'pooja_approval',
        'hall_booking',
        'hall_approval',
        'view_events',
        'edit_events',
        'annadhanam_registrations',
        'annadhanam_approval',
      ];

      // Seed permissions table with required IDs to satisfy FK constraint
      const PERMISSION_NAMES = {
        dashboard: 'Dashboard',
        member_entry: 'Member Entry',
        master_data: 'Master Data',
        balance_sheet: 'Balance Sheet',
        ledger_management: 'Ledger Management',
        transaction: 'Transactions',
        report: 'Reports',
        reports: 'Reports',
        setting: 'Settings',
        pdf_settings: 'PDF Settings',
        property_registrations: 'Property Registrations',
        view_donations: 'View Donations',
        edit_donations: 'Edit Donations',
        receipts: 'Receipts',
        donation_approval: 'Donation Approval',
        session_logs: 'Session Logs',
        view_session_logs: 'Session Logs',
        activity_logs: 'Activity Logs',
        tax_registrations: 'Tax Registrations',
        user_registrations: 'User Registrations',
        pooja_registrations: 'Pooja Registrations',
        pooja_approval: 'Pooja Approval',
        hall_booking: 'Hall Booking',
        hall_approval: 'Hall Approval',
        view_events: 'View Events',
        edit_events: 'Edit Events',
        annadhanam_registrations: 'Annadhanam Registrations',
        annadhanam_approval: 'Annadhanam Approval',
      };

      const permRows = ALL_PERMISSION_IDS.map(id => ({ id, name: PERMISSION_NAMES[id] || id, description: null }));
      try {
        if (typeof db.client.config.client === 'string' && db.client.config.client.includes('mysql')) {
          await db('permissions')
            .insert(permRows)
            .onConflict('id')
            .ignore();
        } else {
          await db('permissions')
            .insert(permRows)
            .onConflict('id')
            .ignore();
        }
      } catch (e) {
        // Best-effort; ignore if table or constraint differs
        console.warn('Permission seed skipped:', e.message);
      }

      for (const pid of ALL_PERMISSION_IDS) {
        const existing = await db('user_permissions')
          .where({ user_id: createdUser.id, permission_id: pid })
          .first();
        if (existing) {
          await db('user_permissions')
            .where({ user_id: createdUser.id, permission_id: pid })
            .update({ access_level: 'full', updated_at: db.fn.now() });
        } else {
          await db('user_permissions').insert({
            user_id: createdUser.id,
            permission_id: pid,
            access_level: 'full',
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      }

      // If custom permissions are provided, save them (overrides are allowed)
      if (customPermissions && Array.isArray(customPermissions) && customPermissions.length) {
        const permissionRecords = customPermissions.map(perm => ({
          user_id: createdUser.id,
          permission_id: perm.id,
          access_level: perm.access
        }));
        await db('user_permissions').insert(permissionRecords);
      }

      return res.json({
        success: true,
        user: {
          id: createdUser.id,
          mobile: createdUser.mobile,
          username: createdUser.username,
          email: createdUser.email,
          fullName: createdUser.full_name,
          role: createdUser.role,
          templeId: createdUser.temple_id,
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Database error during registration.' });
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

  // Delete user (admin/superadmin only)
  router.delete('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const target = await db('users').where({ id: userId }).first();
      if (!target) return res.status(404).json({ error: 'User not found.' });

      // Only same temple admins/superadmins
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only admin or superadmin can delete users.' });
      }
      if (target.temple_id !== req.user.templeId) {
        return res.status(403).json({ error: 'You can only delete users from your own temple.' });
      }
      // Prevent deleting superadmin unless requester is superadmin
      if (target.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only superadmin can delete a superadmin user.' });
      }
      // Optional: prevent self-delete to avoid locking out
      if (Number(userId) === Number(req.user.id)) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
      }

      // Delete dependent rows first
      await db('user_permissions').where({ user_id: userId }).del();

      // Finally delete the user
      await db('users').where({ id: userId }).del();

      return res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/users/:userId error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
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
