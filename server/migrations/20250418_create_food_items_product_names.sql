-- Migration: Create master_food_items and master_product_names tables
-- Created: 2025-04-18

-- Food Items Master Table
CREATE TABLE IF NOT EXISTS master_food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    UNIQUE(temple_id, name)
);

-- Product Names Master Table  
CREATE TABLE IF NOT EXISTS master_product_names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    UNIQUE(temple_id, name)
);

-- Create indexes for faster search
CREATE INDEX IF NOT EXISTS idx_food_items_temple_name ON master_food_items(temple_id, name);
CREATE INDEX IF NOT EXISTS idx_product_names_temple_name ON master_product_names(temple_id, name);
CREATE INDEX IF NOT EXISTS idx_food_items_search ON master_food_items(name);
CREATE INDEX IF NOT EXISTS idx_product_names_search ON master_product_names(name);

-- MySQL Compatible Version (if using MySQL)
/*
-- Food Items Master Table (MySQL)
CREATE TABLE IF NOT EXISTS master_food_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temple_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    UNIQUE KEY unique_food_item (temple_id, name),
    INDEX idx_food_items_temple_name (temple_id, name),
    INDEX idx_food_items_search (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Names Master Table (MySQL)
CREATE TABLE IF NOT EXISTS master_product_names (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temple_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_name (temple_id, name),
    INDEX idx_product_names_temple_name (temple_id, name),
    INDEX idx_product_names_search (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/
