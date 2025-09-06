-- Create ledger_entries table for temple financial records
CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT NOT NULL,
    date TEXT NOT NULL,
    donor_name TEXT NOT NULL,
    village TEXT,
    mobile TEXT,
    amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    donation_amount REAL DEFAULT 0,
    year TEXT,
    status TEXT DEFAULT 'pending',
    temple_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_temple_id ON ledger_entries(temple_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_donor_name ON ledger_entries(donor_name);
CREATE INDEX IF NOT EXISTS idx_ledger_receipt_no ON ledger_entries(receipt_no);
