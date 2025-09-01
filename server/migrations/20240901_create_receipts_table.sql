-- Create receipts table
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  register_no TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL, -- 'receipt' or 'payment'
  from_person TEXT,
  to_person TEXT,
  amount REAL NOT NULL,
  remarks TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  temple_id INTEGER NOT NULL REFERENCES temples(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_receipts_temple_id ON receipts(temple_id);
CREATE INDEX idx_receipts_date ON receipts(date);
CREATE INDEX idx_receipts_register_no ON receipts(register_no);
