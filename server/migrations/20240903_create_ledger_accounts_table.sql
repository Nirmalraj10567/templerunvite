-- Create ledger_accounts table with all frontend fields
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    under TEXT,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    address TEXT,
    city TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    note TEXT,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_date ON ledger_accounts(date);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_name ON ledger_accounts(name);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_under ON ledger_accounts(under);
