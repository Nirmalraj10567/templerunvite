-- MySQL version of hall_booking_logs table
CREATE TABLE IF NOT EXISTS hall_booking_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temple_id INT NOT NULL,
    hall_booking_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    details TEXT, -- JSON string of the record state or diff
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    FOREIGN KEY (hall_booking_id) REFERENCES marriage_hall_bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hall_booking_logs_temple_id ON hall_booking_logs(temple_id);
CREATE INDEX IF NOT EXISTS idx_hall_booking_logs_hall_booking_id ON hall_booking_logs(hall_booking_id);
CREATE INDEX IF NOT EXISTS idx_hall_booking_logs_created_at ON hall_booking_logs(created_at);
