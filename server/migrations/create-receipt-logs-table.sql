-- MySQL version of receipt_logs table
CREATE TABLE IF NOT EXISTS receipt_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temple_id INT NOT NULL,
    receipt_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    details TEXT, -- JSON string of the record state or diff
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_logs_temple_id ON receipt_logs(temple_id);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_receipt_id ON receipt_logs(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_created_at ON receipt_logs(created_at);
