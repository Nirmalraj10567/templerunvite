-- MySQL version of pooja_logs table
CREATE TABLE IF NOT EXISTS pooja_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temple_id INT NOT NULL,
    pooja_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    details TEXT, -- JSON string of the record state or diff
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    FOREIGN KEY (pooja_id) REFERENCES pooja_registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pooja_logs_temple_id ON pooja_logs(temple_id);
CREATE INDEX IF NOT EXISTS idx_pooja_logs_pooja_id ON pooja_logs(pooja_id);
CREATE INDEX IF NOT EXISTS idx_pooja_logs_created_at ON pooja_logs(created_at);
