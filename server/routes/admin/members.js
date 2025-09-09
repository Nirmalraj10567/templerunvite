const express = require('express');

function createAdminMembersRouter({ db, authenticateToken, authorizePermission, authorizeRole }) {
  const router = express.Router();

  // Minimal users list for dropdowns
  router.get('/', authenticateToken, authorizePermission('member_management', 'view'), async (req, res) => {
    try {
      const minimal = String(req.query.minimal || '').trim() === '1';
      if (minimal) {
        const rows = await db('users')
          .select('id as user_id', 'full_name', 'username', 'mobile')
          .orderBy('full_name', 'asc');
        const data = rows.map(r => ({
          user_id: r.user_id,
          name: (r.full_name && r.full_name.trim()) || r.username || r.mobile || String(r.user_id)
        }));
        return res.json({ success: true, data });
      }
      // Fallback: basic list
      const users = await db('users')
        .select('id', 'full_name', 'username', 'mobile', 'email', 'role', 'status')
        .orderBy('id', 'desc')
        .limit(100);
      res.json({ success: true, data: users });
    } catch (err) {
      console.error('Error listing members:', err);
      res.status(500).json({ error: 'Failed to list members' });
    }
  });

  // Block/Unblock member (superadmin only)
  router.put('/:id/block', authenticateToken, authorizePermission('member_management', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const { blocked } = req.body;
      
      console.log(`[DEBUG] Block/unblock request for user id: ${id}, blocked: ${blocked}`);
      console.log(`[DEBUG] Authenticated user:`, req.user);
      
      // First try to find user by mobile if id is from user_registrations
      const user = await db('users')
        .leftJoin('user_registrations', 'users.mobile', 'user_registrations.mobile_number')
        .where('user_registrations.id', id)
        .orWhere('users.id', id)
        .select('users.id')
        .first();
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const result = await db('users')
        .where('id', user.id)
        .update({ 
          status: blocked ? 'blocked' : 'active',
          updated_at: db.fn.now() 
        });
      
      console.log(`[DEBUG] Update result:`, result);
      
      if (result === 0) {
        console.log(`[WARN] No user found with id: ${id}`);
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('[ERROR] Block/unblock error:', err);
      res.status(500).json({ 
        error: 'Failed to update member status',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Update member details and permissions (superadmin only)
  router.put('/:id', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    const { id } = req.params;
    const { email, fullName, role, status, customPermissions } = req.body;
  
    try {
      const updateData = {
        email: email || null,
        full_name: fullName || null,
        role: role || 'member',
        status: status || 'active',
        updated_at: db.fn.now()
      };
  
      await db('users').where('id', id).update(updateData);
  
      // Update permissions if provided
      if (customPermissions && Array.isArray(customPermissions)) {
        await db('user_permissions').where('user_id', id).del();
        
        const permissionRecords = customPermissions.map(perm => ({
          user_id: id,
          permission_id: perm.id,
          access_level: perm.access
        }));
        
        await db('user_permissions').insert(permissionRecords);
      }
  
      res.json({ success: true, message: 'Member updated successfully' });
    } catch (err) {
      console.error('Error updating member:', err);
      res.status(500).json({ 
        error: 'Error updating member',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  return router;
}

module.exports = createAdminMembersRouter;
