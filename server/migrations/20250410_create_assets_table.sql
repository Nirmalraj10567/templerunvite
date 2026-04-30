-- Create assets table for property management (matches flowchart requirements)
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  details TEXT,
  value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Source tracking fields
  asset_source TEXT, -- 'purchase', 'donation', 'other'
  source_details TEXT, -- Additional details about source (e.g., "Audio Set Example: 10 comes from where")
  donor_name TEXT,
  donor_contact TEXT,
  -- Status tracking
  status TEXT DEFAULT 'active', -- 'active', 'converted', 'disposed'
  converted_at TIMESTAMP,
  converted_by INTEGER,
  conversion_income_id INTEGER, -- Reference to ledger entry when converted to cash
  used_qty INTEGER DEFAULT 0, -- Quantity used
  for_sell_qty INTEGER DEFAULT 0, -- Quantity for sell
  convert_price DECIMAL(12, 2) DEFAULT 0, -- Price per unit when converting
  -- Ownership
  created_by INTEGER,
  temple_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create asset_logs table for audit trail
CREATE TABLE IF NOT EXISTS asset_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'convert_to_cash'
  details TEXT, -- JSON with before/after data or conversion details
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_temple ON assets(temple_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_asset_logs_asset ON asset_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_updated_at ON assets(updated_at);

-- Add asset_management permission
INSERT OR IGNORE INTO permissions (id, name, description)
VALUES ('asset_management', 'Asset Management', 'Manage temple assets and convert to cash');

-- Grant full permission to admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'admin', 'asset_management', 'full'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'admin' AND permission_id = 'asset_management'
);

-- Grant view permission to member role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'member', 'asset_management', 'view'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'member' AND permission_id = 'asset_management'
);
