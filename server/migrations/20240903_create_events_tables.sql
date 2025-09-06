-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    temple_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create event_images table
CREATE TABLE IF NOT EXISTS event_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add permissions for events module
INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
    ('view_events', 'View Events', 'View temple events'),
    ('edit_events', 'Edit Events', 'Create and edit temple events');

-- Grant permissions to roles
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES
    ('admin', 'view_events', 'full'),
    ('admin', 'edit_events', 'full'),
    ('superadmin', 'view_events', 'full'),
    ('superadmin', 'edit_events', 'full'),
    ('member', 'view_events', 'view');
