-- Simple SQL to create hall_booking_logs table
-- Run this if you get syntax errors with the migration

CREATE TABLE IF NOT EXISTS hall_booking_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER NOT NULL,
    hall_booking_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hall_booking_logs_temple_id ON hall_booking_logs(temple_id);
CREATE INDEX IF NOT EXISTS idx_hall_booking_logs_hall_booking_id ON hall_booking_logs(hall_booking_id);
CREATE INDEX IF NOT EXISTS idx_hall_booking_logs_created_at ON hall_booking_logs(created_at);
