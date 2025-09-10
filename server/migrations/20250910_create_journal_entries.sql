-- Create journal_entries table for double-entry accounting
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  entry_type TEXT NOT NULL CHECK(entry_type IN ('transfer','income','expense')),
  remarks TEXT,
  reference_type TEXT,
  reference_id INTEGER,
  temple_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_from ON journal_entries(from_account);
CREATE INDEX IF NOT EXISTS idx_journal_entries_to ON journal_entries(to_account);
CREATE INDEX IF NOT EXISTS idx_journal_entries_temple ON journal_entries(temple_id);
