-- Enhanced Permissions Migration
-- This script updates the permission system to support more granular permissions

-- First, let's add default permissions for existing users based on their roles

-- Grant comprehensive permissions to superadmin users (mobile: 9999999999)
INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
SELECT u.id, p.permission_id, 'full'
FROM users u
CROSS JOIN (
  SELECT 'member_entry' as permission_id
  UNION SELECT 'member_view'
  UNION SELECT 'master_data'
  UNION SELECT 'ledger_management'
  UNION SELECT 'session_logs'
  UNION SELECT 'activity_logs'
  UNION SELECT 'user_management'
  UNION SELECT 'temple_settings'
  UNION SELECT 'reports'
  UNION SELECT 'backup_restore'
) p
WHERE u.mobile = '9999999999';

-- Grant admin permissions to admin role users
INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
SELECT u.id, p.permission_id, p.access_level
FROM users u
CROSS JOIN (
  SELECT 'member_entry' as permission_id, 'full' as access_level
  UNION SELECT 'member_view', 'full'
  UNION SELECT 'master_data', 'full'
  UNION SELECT 'ledger_management', 'edit'
  UNION SELECT 'session_logs', 'view'
  UNION SELECT 'activity_logs', 'view'
  UNION SELECT 'user_management', 'edit'
  UNION SELECT 'reports', 'view'
) p
WHERE u.role = 'admin' AND u.mobile != '9999999999';

-- Grant basic permissions to member role users
INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
SELECT u.id, p.permission_id, 'view'
FROM users u
CROSS JOIN (
  SELECT 'member_view' as permission_id
  UNION SELECT 'master_data'
) p
WHERE u.role = 'member';

-- Update any existing 'none' access levels to 'view' for active permissions
UPDATE user_permissions 
SET access_level = 'view' 
WHERE access_level = 'none';