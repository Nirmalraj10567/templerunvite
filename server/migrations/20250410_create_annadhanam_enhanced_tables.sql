-- Migration: Enhanced Annadhanam Tables
-- Based on annadhanam-free-meal-service-flow.png flowchart
-- Created: 2025-04-10

-- 1. Donors Table - For storing donor information separately
CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temple_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  donor_type TEXT DEFAULT 'individual', -- individual, organization, walk_in
  is_walk_in BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_donors_temple ON donors(temple_id);
CREATE INDEX IF NOT EXISTS idx_donors_mobile ON donors(mobile_number);
CREATE INDEX IF NOT EXISTS idx_donors_name ON donors(name);

-- 2. Meal Packages Table - Breakfast/Lunch/Dinner/Custom with pricing
CREATE TABLE IF NOT EXISTS meal_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temple_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL, -- Breakfast, Lunch, Dinner, Custom
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_per_person DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_people INTEGER DEFAULT 1,
  max_people INTEGER DEFAULT 1000,
  meal_time TEXT NOT NULL, -- breakfast, lunch, dinner
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_packages_temple ON meal_packages(temple_id);
CREATE INDEX IF NOT EXISTS idx_meal_packages_time ON meal_packages(meal_time);
CREATE INDEX IF NOT EXISTS idx_meal_packages_active ON meal_packages(is_active);

-- 3. Meal Slots Table - Track availability per date and time
CREATE TABLE IF NOT EXISTS meal_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temple_id INTEGER NOT NULL DEFAULT 1,
  slot_date DATE NOT NULL,
  meal_time TEXT NOT NULL, -- breakfast, lunch, dinner
  total_capacity INTEGER NOT NULL DEFAULT 100,
  booked_count INTEGER DEFAULT 0,
  available_count INTEGER DEFAULT 100,
  is_available BOOLEAN DEFAULT 1,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  UNIQUE(temple_id, slot_date, meal_time)
);

CREATE INDEX IF NOT EXISTS idx_meal_slots_temple ON meal_slots(temple_id);
CREATE INDEX IF NOT EXISTS idx_meal_slots_date ON meal_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_meal_slots_time ON meal_slots(meal_time);
CREATE INDEX IF NOT EXISTS idx_meal_slots_available ON meal_slots(is_available);

-- 4. Annadhanam Feedback Table - Post-service feedback
CREATE TABLE IF NOT EXISTS annadhanam_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temple_id INTEGER NOT NULL DEFAULT 1,
  annadhanam_id INTEGER NOT NULL,
  donor_id INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  would_recommend BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  FOREIGN KEY (annadhanam_id) REFERENCES annadhanam(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_annadhanam_feedback_temple ON annadhanam_feedback(temple_id);
CREATE INDEX IF NOT EXISTS idx_annadhanam_feedback_annadhanam ON annadhanam_feedback(annadhanam_id);
CREATE INDEX IF NOT EXISTS idx_annadhanam_feedback_donor ON annadhanam_feedback(donor_id);

-- 5. Alter Annadhanam Table - Add new columns for flowchart workflow
ALTER TABLE annadhanam ADD COLUMN donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL;
ALTER TABLE annadhanam ADD COLUMN package_id INTEGER REFERENCES meal_packages(id) ON DELETE SET NULL;
ALTER TABLE annadhanam ADD COLUMN calculated_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE annadhanam ADD COLUMN confirmation_status TEXT DEFAULT 'pending'; -- pending, confirmed, cancelled
ALTER TABLE annadhanam ADD COLUMN service_status TEXT DEFAULT 'pending'; -- pending, delivered, completed
ALTER TABLE annadhanam ADD COLUMN special_instructions TEXT;
ALTER TABLE annadhanam ADD COLUMN booking_source TEXT DEFAULT 'web'; -- web, mobile, walk_in
ALTER TABLE annadhanam ADD COLUMN is_walk_in BOOLEAN DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_annadhanam_donor ON annadhanam(donor_id);
CREATE INDEX IF NOT EXISTS idx_annadhanam_package ON annadhanam(package_id);
CREATE INDEX IF NOT EXISTS idx_annadhanam_confirmation ON annadhanam(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_annadhanam_service ON annadhanam(service_status);
CREATE INDEX IF NOT EXISTS idx_annadhanam_booking_source ON annadhanam(booking_source);

-- 6. Insert Default Meal Packages
INSERT OR IGNORE INTO meal_packages (temple_id, name, description, base_price, price_per_person, meal_time, min_people, max_people) VALUES
(1, 'Breakfast', 'Traditional South Indian breakfast with idli, dosa, pongal, and beverages', 1000.00, 50.00, 'breakfast', 10, 500),
(1, 'Lunch', 'Full South Indian lunch with rice, sambar, rasam, poriyal, kootu, curd, and sweets', 2000.00, 75.00, 'lunch', 10, 1000),
(1, 'Dinner', 'Evening meal with chapati, rice, dal, curry, and dessert', 1500.00, 60.00, 'dinner', 10, 500),
(1, 'Custom', 'Customizable meal package as per donor requirements', 0.00, 0.00, 'custom', 1, 2000);

-- 7. Permission for managing meal slots and packages
INSERT OR IGNORE INTO permissions (id, name, description)
VALUES ('annadhanam_meal_management', 'Annadhanam Meal Management', 'Manage meal packages, slots, and pricing');

-- Grant permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'admin', 'annadhanam_meal_management', 'full'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'admin' AND permission_id = 'annadhanam_meal_management');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'superadmin', 'annadhanam_meal_management', 'full'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'superadmin' AND permission_id = 'annadhanam_meal_management');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'member', 'annadhanam_meal_management', 'view'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'member' AND permission_id = 'annadhanam_meal_management');
