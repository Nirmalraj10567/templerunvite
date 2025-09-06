-- Create kanikalar (wedding) table
CREATE TABLE IF NOT EXISTS kanikalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bride_name TEXT NOT NULL,
    groom_name TEXT NOT NULL,
    wedding_date TEXT NOT NULL,
    venue TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create wedding_events table
CREATE TABLE IF NOT EXISTS wedding_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kanikalar_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (kanikalar_id) REFERENCES kanikalar(id) ON DELETE CASCADE
);

-- Add permissions for kanikalar module
INSERT OR IGNORE INTO permissions (name, description) VALUES 
    ('view_kanikalar', 'View wedding details'),
    ('manage_kanikalar', 'Manage wedding details'),
    ('view_wedding_events', 'View wedding events'),
    ('manage_wedding_events', 'Manage wedding events');
