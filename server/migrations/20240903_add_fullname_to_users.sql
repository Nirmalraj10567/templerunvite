-- Drop and recreate users table with full_name column
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  mobile TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  temple_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial admin user with all required fields
INSERT INTO users (username, email, full_name, mobile, password, role, temple_id)
VALUES ('superadmin', 'superadmin@temple.com', 'Super Administrator', '9999999999', '$2a$10$VBGAzqAXVUzm/WsBULZ1leAxoVFU1UQHiozujmirGnmY0BWAoOMxa', 'superadmin', 1);
