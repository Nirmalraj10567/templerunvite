-- Create assets table for property management (MySQL version)
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  details TEXT,
  value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Source tracking fields
  asset_source VARCHAR(50), -- 'purchase', 'donation', 'other'
  source_details TEXT, -- Additional details about source
  donor_name VARCHAR(255),
  donor_contact VARCHAR(50),
  -- Status tracking
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'converted', 'disposed'
  converted_at TIMESTAMP NULL,
  converted_by INT,
  conversion_income_id INT, -- Reference to ledger entry when converted to cash
  used_qty INT DEFAULT 0, -- Quantity used
  for_sell_qty INT DEFAULT 0, -- Quantity for sell
  convert_price DECIMAL(12, 2) DEFAULT 0, -- Price per unit when converting
  -- Ownership
  created_by INT,
  temple_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create asset_logs table for audit trail
CREATE TABLE IF NOT EXISTS asset_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'convert_to_cash'
  details JSON, -- JSON with before/after data or conversion details
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for performance
CREATE INDEX idx_assets_temple ON assets(temple_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_created_by ON assets(created_by);
CREATE INDEX idx_asset_logs_asset ON asset_logs(asset_id);
CREATE INDEX idx_assets_updated_at ON assets(updated_at);

-- Add asset_management permission
INSERT IGNORE INTO permissions (id, name, description)
VALUES ('asset_management', 'Asset Management', 'Manage temple assets and convert to cash');

-- Grant full permission to admin role
INSERT IGNORE INTO role_permissions (role_id, permission_id, access_level)
VALUES ('admin', 'asset_management', 'full');

-- Grant view permission to member role
INSERT IGNORE INTO role_permissions (role_id, permission_id, access_level)
VALUES ('member', 'asset_management', 'view');
