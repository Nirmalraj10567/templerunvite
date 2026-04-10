-- Migration: Enhanced Annadhanam Tables (MySQL)
-- Based on annadhanam-free-meal-service-flow.png flowchart
-- Created: 2025-04-10

-- 1. Donors Table - For storing donor information separately
CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temple_id INT NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  donor_type VARCHAR(50) DEFAULT 'individual',
  is_walk_in TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_donors_temple ON donors(temple_id);
CREATE INDEX idx_donors_mobile ON donors(mobile_number);
CREATE INDEX idx_donors_name ON donors(name);

-- 2. Meal Packages Table - Breakfast/Lunch/Dinner/Custom with pricing
CREATE TABLE IF NOT EXISTS meal_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temple_id INT NOT NULL DEFAULT 1,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_per_person DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_people INT DEFAULT 1,
  max_people INT DEFAULT 1000,
  meal_time VARCHAR(50) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_meal_packages_temple ON meal_packages(temple_id);
CREATE INDEX idx_meal_packages_time ON meal_packages(meal_time);
CREATE INDEX idx_meal_packages_active ON meal_packages(is_active);

-- 3. Meal Slots Table - Track availability per date and time
CREATE TABLE IF NOT EXISTS meal_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temple_id INT NOT NULL DEFAULT 1,
  slot_date DATE NOT NULL,
  meal_time VARCHAR(50) NOT NULL,
  total_capacity INT NOT NULL DEFAULT 100,
  booked_count INT DEFAULT 0,
  available_count INT DEFAULT 100,
  is_available TINYINT(1) DEFAULT 1,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  UNIQUE KEY unique_slot (temple_id, slot_date, meal_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_meal_slots_temple ON meal_slots(temple_id);
CREATE INDEX idx_meal_slots_date ON meal_slots(slot_date);
CREATE INDEX idx_meal_slots_time ON meal_slots(meal_time);
CREATE INDEX idx_meal_slots_available ON meal_slots(is_available);

-- 4. Annadhanam Feedback Table - Post-service feedback
CREATE TABLE IF NOT EXISTS annadhanam_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temple_id INT NOT NULL DEFAULT 1,
  annadhanam_id INT NOT NULL,
  donor_id INT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  food_quality_rating INT CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
  service_rating INT CHECK (service_rating >= 1 AND service_rating <= 5),
  cleanliness_rating INT CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  would_recommend TINYINT(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  FOREIGN KEY (annadhanam_id) REFERENCES annadhanam(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_annadhanam_feedback_temple ON annadhanam_feedback(temple_id);
CREATE INDEX idx_annadhanam_feedback_annadhanam ON annadhanam_feedback(annadhanam_id);
CREATE INDEX idx_annadhanam_feedback_donor ON annadhanam_feedback(donor_id);

-- 5. Alter Annadhanam Table - Add new columns for flowchart workflow
ALTER TABLE annadhanam 
ADD COLUMN IF NOT EXISTS donor_id INT,
ADD COLUMN IF NOT EXISTS package_id INT,
ADD COLUMN IF NOT EXISTS calculated_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS service_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS booking_source VARCHAR(50) DEFAULT 'web',
ADD COLUMN IF NOT EXISTS is_walk_in TINYINT(1) DEFAULT 0;

-- Add foreign keys if not exists
SET @dbname = DATABASE();
SET @sql = '';

SELECT COUNT(*) INTO @exists 
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = @dbname 
AND TABLE_NAME = 'annadhanam' 
AND CONSTRAINT_NAME = 'fk_annadhanam_donor';

SET @sql = IF(@exists = 0, 
  'ALTER TABLE annadhanam ADD CONSTRAINT fk_annadhanam_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @exists 
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = @dbname 
AND TABLE_NAME = 'annadhanam' 
AND CONSTRAINT_NAME = 'fk_annadhanam_package';

SET @sql = IF(@exists = 0, 
  'ALTER TABLE annadhanam ADD CONSTRAINT fk_annadhanam_package FOREIGN KEY (package_id) REFERENCES meal_packages(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create indexes for new columns
CREATE INDEX idx_annadhanam_donor ON annadhanam(donor_id);
CREATE INDEX idx_annadhanam_package ON annadhanam(package_id);
CREATE INDEX idx_annadhanam_confirmation ON annadhanam(confirmation_status);
CREATE INDEX idx_annadhanam_service ON annadhanam(service_status);
CREATE INDEX idx_annadhanam_booking_source ON annadhanam(booking_source);

-- 6. Insert Default Meal Packages (if not exists)
INSERT INTO meal_packages (temple_id, name, description, base_price, price_per_person, meal_time, min_people, max_people)
SELECT 1, 'Breakfast', 'Traditional South Indian breakfast with idli, dosa, pongal, and beverages', 1000.00, 50.00, 'breakfast', 10, 500
WHERE NOT EXISTS (SELECT 1 FROM meal_packages WHERE name = 'Breakfast' AND temple_id = 1);

INSERT INTO meal_packages (temple_id, name, description, base_price, price_per_person, meal_time, min_people, max_people)
SELECT 1, 'Lunch', 'Full South Indian lunch with rice, sambar, rasam, poriyal, kootu, curd, and sweets', 2000.00, 75.00, 'lunch', 10, 1000
WHERE NOT EXISTS (SELECT 1 FROM meal_packages WHERE name = 'Lunch' AND temple_id = 1);

INSERT INTO meal_packages (temple_id, name, description, base_price, price_per_person, meal_time, min_people, max_people)
SELECT 1, 'Dinner', 'Evening meal with chapati, rice, dal, curry, and dessert', 1500.00, 60.00, 'dinner', 10, 500
WHERE NOT EXISTS (SELECT 1 FROM meal_packages WHERE name = 'Dinner' AND temple_id = 1);

INSERT INTO meal_packages (temple_id, name, description, base_price, price_per_person, meal_time, min_people, max_people)
SELECT 1, 'Custom', 'Customizable meal package as per donor requirements', 0.00, 0.00, 'custom', 1, 2000
WHERE NOT EXISTS (SELECT 1 FROM meal_packages WHERE name = 'Custom' AND temple_id = 1);

-- 7. Permission for managing meal slots and packages
INSERT IGNORE INTO permissions (id, name, description)
VALUES ('annadhanam_meal_management', 'Annadhanam Meal Management', 'Manage meal packages, slots, and pricing');

-- Grant permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id, access_level)
VALUES ('admin', 'annadhanam_meal_management', 'full');

INSERT IGNORE INTO role_permissions (role_id, permission_id, access_level)
VALUES ('superadmin', 'annadhanam_meal_management', 'full');

INSERT IGNORE INTO role_permissions (role_id, permission_id, access_level)
VALUES ('member', 'annadhanam_meal_management', 'view');
