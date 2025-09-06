-- Add default member entry permissions for existing admin/superadmin users
INSERT INTO user_permissions (user_id, permission_id, access_level)
SELECT id, 'member_entry', 'full' 
FROM users 
WHERE role IN ('admin', 'superadmin') 
AND NOT EXISTS (
  SELECT 1 FROM user_permissions 
  WHERE user_permissions.user_id = users.id 
  AND permission_id = 'member_entry'
);

-- Add view permission for existing member role users
INSERT INTO user_permissions (user_id, permission_id, access_level)
SELECT id, 'member_entry', 'view' 
FROM users 
WHERE role = 'member' 
AND NOT EXISTS (
  SELECT 1 FROM user_permissions 
  WHERE user_permissions.user_id = users.id 
  AND permission_id = 'member_entry'
);
