-- Create ledger_entry_logs table
CREATE TABLE IF NOT EXISTS ledger_entry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ledger_entry_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    created_by INTEGER,
    details TEXT, -- JSON string containing the change details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ledger_entry_id) REFERENCES ledger_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_entry_logs_ledger_entry_id ON ledger_entry_logs(ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_logs_created_by ON ledger_entry_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_logs_created_at ON ledger_entry_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_logs_action ON ledger_entry_logs(action);
