-- Add approval system fields to pooja table
ALTER TABLE pooja ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
ALTER TABLE pooja ADD COLUMN submitted_by_mobile TEXT;
ALTER TABLE pooja ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pooja ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE pooja ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE pooja ADD COLUMN rejection_reason TEXT;
ALTER TABLE pooja ADD COLUMN admin_notes TEXT;

-- Create pooja_approval_logs table for tracking approval history
CREATE TABLE IF NOT EXISTS pooja_approval_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pooja_id INTEGER NOT NULL REFERENCES pooja(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'cancelled', 'modified')),
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  old_status TEXT,
  new_status TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pooja_status ON pooja(status);
CREATE INDEX IF NOT EXISTS idx_pooja_submitted_by_mobile ON pooja(submitted_by_mobile);
CREATE INDEX IF NOT EXISTS idx_pooja_approval_logs_pooja_id ON pooja_approval_logs(pooja_id);
CREATE INDEX IF NOT EXISTS idx_pooja_approval_logs_action ON pooja_approval_logs(action);

-- Add permissions for pooja approval system
INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
('pooja_approval', 'Pooja Approval', 'Approve or reject pooja requests from mobile users'),
('pooja_mobile_submit', 'Pooja Mobile Submit', 'Submit pooja requests from mobile app');

-- Grant permissions to roles
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES
('admin', 'pooja_approval', 'full'),
('superadmin', 'pooja_approval', 'full'),
('member', 'pooja_mobile_submit', 'full');

-- Grant specific permission to user with mobile 9999999999
INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
SELECT u.id, 'pooja_mobile_submit', 'full'
FROM users u
WHERE u.mobile = '9999999999'
AND NOT EXISTS (
  SELECT 1 FROM user_permissions up
  WHERE up.user_id = u.id AND up.permission_id = 'pooja_mobile_submit'
);
