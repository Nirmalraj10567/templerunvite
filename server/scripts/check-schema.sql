-- File: server/scripts/check-schema.sql
-- Check if journal_entries table exists and show its structure
SELECT name FROM sqlite_master WHERE type='table' AND name='journal_entries';

-- Show structure of journal_entries if it exists
PRAGMA table_info(journal_entries);

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  entry_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  temple_id INTEGER,
  remarks TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Show the final structure
PRAGMA table_info(journal_entries);
