-- First check if the table exists, if not create it
CREATE TABLE IF NOT EXISTS donation_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    unit VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Get the first temple ID to use as default
SELECT id INTO @first_temple_id FROM temples ORDER BY id LIMIT 1;

-- Add temple_id column if it doesn't exist
SELECT COUNT(*)
INTO @column_exists
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'donation_products'
AND COLUMN_NAME = 'temple_id';

SET @sql = IF(@column_exists = 0,
    CONCAT('ALTER TABLE donation_products ADD COLUMN temple_id INT NOT NULL DEFAULT ', @first_temple_id),
    'SELECT "temple_id column already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing records to use the first temple ID
UPDATE donation_products 
SET temple_id = @first_temple_id 
WHERE temple_id IS NULL;

-- Add foreign key if it doesn't exist
SELECT COUNT(*)
INTO @constraint_exists
FROM information_schema.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = DATABASE()
AND CONSTRAINT_NAME = 'fk_donation_products_temple'
AND TABLE_NAME = 'donation_products';

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE donation_products 
    ADD CONSTRAINT fk_donation_products_temple 
    FOREIGN KEY (temple_id) 
    REFERENCES temples(id) 
    ON DELETE CASCADE',
    'SELECT "Foreign key already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add unique constraint if it doesn't exist
SELECT COUNT(*)
INTO @unique_exists
FROM information_schema.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = DATABASE()
AND CONSTRAINT_NAME = 'unique_label_per_temple'
AND TABLE_NAME = 'donation_products';

SET @sql = IF(@unique_exists = 0,
    'ALTER TABLE donation_products 
    ADD CONSTRAINT unique_label_per_temple 
    UNIQUE (label, temple_id)',
    'SELECT "Unique constraint already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add temple_id index if it doesn't exist
SELECT COUNT(*)
INTO @temple_idx_exists
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'donation_products'
AND INDEX_NAME = 'idx_donation_products_temple_id';

SET @sql = IF(@temple_idx_exists = 0,
    'ALTER TABLE donation_products ADD INDEX idx_donation_products_temple_id (temple_id)',
    'SELECT "Temple index already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add label index if it doesn't exist
SELECT COUNT(*)
INTO @label_idx_exists
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'donation_products'
AND INDEX_NAME = 'idx_donation_products_label';

SET @sql = IF(@label_idx_exists = 0,
    'ALTER TABLE donation_products ADD INDEX idx_donation_products_label ((LOWER(label)))',
    'SELECT "Label index already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verification query
SELECT 
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    TABLE_NAME
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'donation_products';

-- Show indexes
SHOW INDEX FROM donation_products;

-- Show temple assignments
SELECT 
    d.id,
    d.label,
    d.temple_id,
    t.name as temple_name
FROM donation_products d
JOIN temples t ON d.temple_id = t.id;

-- Rollback script (if needed):
/*
ALTER TABLE donation_products 
    DROP FOREIGN KEY IF EXISTS fk_donation_products_temple,
    DROP INDEX IF EXISTS unique_label_per_temple,
    DROP INDEX IF EXISTS idx_donation_products_temple_id,
    DROP INDEX IF EXISTS idx_donation_products_label;
*/