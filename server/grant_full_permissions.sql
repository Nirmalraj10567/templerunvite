-- Grant full permissions for testing
INSERT INTO user_permissions (user_id, permission_id, access_level)
VALUES (9999999999, 'member_entry', 'full'),
       (9999999999, 'master_data', 'full'),
       (9999999999, 'transactions', 'full'),
       (9999999999, 'reports', 'full'),
       (9999999999, 'settings', 'full');

-- Verify permissions were granted
SELECT * FROM user_permissions WHERE user_id = 9999999999;
