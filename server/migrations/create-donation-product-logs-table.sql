CREATE TABLE IF NOT EXISTS donation_product_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER NOT NULL,
    donation_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    details TEXT, -- JSON string of the record state or diff
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_donation_product_logs_temple_id ON donation_product_logs(temple_id);
CREATE INDEX IF NOT EXISTS idx_donation_product_logs_donation_id ON donation_product_logs(donation_id);
CREATE INDEX IF NOT EXISTS idx_donation_product_logs_created_at ON donation_product_logs(created_at);
