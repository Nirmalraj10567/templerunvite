-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- Drop and create tables in dependency order

-- Core tables first (no dependencies or minimal)
DROP TABLE IF EXISTS `knex_migrations`;
CREATE TABLE `knex_migrations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255),
    `batch` INT,
    `migration_time` DATETIME,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `knex_migrations_lock`;
CREATE TABLE `knex_migrations_lock` (
    `index` INT NOT NULL AUTO_INCREMENT,
    `is_locked` INT,
    PRIMARY KEY (`index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
    `id` VARCHAR(255) NOT NULL,
    `name` TEXT NOT NULL,
    `description` TEXT,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `temples`;
CREATE TABLE `temples` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `registration_id` VARCHAR(255),
    `address` TEXT,
    `phone` TEXT,
    `email` TEXT,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: users table — status TEXT → VARCHAR + role VARCHAR + password VARCHAR
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(50),
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `temple_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_login` DATETIME,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_username_unique` (`username`),
    UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Now tables that reference `users` or `temples`

DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL,
    `actor_user_id` INT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `target_table` VARCHAR(255),
    `target_id` INT,
    `details` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `session_logs`;
CREATE TABLE `session_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `login_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `logout_time` DATETIME,
    `ip_address` VARCHAR(255) NOT NULL,
    `user_agent` VARCHAR(255),
    `duration_seconds` INT,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `superadmin_logs`;
CREATE TABLE `superadmin_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(255) NOT NULL,
    `user_agent` VARCHAR(255),
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_settings`;
CREATE TABLE `user_settings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `landing_route` VARCHAR(255) DEFAULT '/dashboard',
    `sidebar_collapsed_default` BOOLEAN NOT NULL DEFAULT FALSE,
    `hidden_menu_keys` TEXT,
    `quick_actions` TEXT,
    `language` VARCHAR(32),
    `theme` VARCHAR(32),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_settings_user_id_unique` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT,
    `permission_id` VARCHAR(255) NOT NULL,
    `access_level` ENUM('full', 'view', 'none') DEFAULT 'none',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_permissions_user_id_permission_id_unique` (`user_id`, `permission_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `role_id` VARCHAR(255) NOT NULL,
    `permission_id` VARCHAR(255) NOT NULL,
    `access_level` TEXT NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Master data tables

DROP TABLE IF EXISTS `master_clans`;
CREATE TABLE `master_clans` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_educations`;
CREATE TABLE `master_educations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_groups`;
CREATE TABLE `master_groups` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_hall_events`;
CREATE TABLE `master_hall_events` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_halls`;
CREATE TABLE `master_halls` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `base_price` FLOAT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_occupations`;
CREATE TABLE `master_occupations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_villages`;
CREATE TABLE `master_villages` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_people`;
CREATE TABLE `master_people` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `gender` VARCHAR(255),
    `dob` VARCHAR(255),
    `address` VARCHAR(255),
    `village` VARCHAR(255),
    `mobile` VARCHAR(255),
    `email` VARCHAR(255),
    `note` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_records`;
CREATE TABLE `master_records` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL,
    `date` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `under` VARCHAR(255) NOT NULL,
    `opening_balance` VARCHAR(255) DEFAULT '0',
    `balance_type` VARCHAR(255) DEFAULT 'credit',
    `address_line1` VARCHAR(255) DEFAULT '',
    `address_line2` VARCHAR(255) DEFAULT '',
    `address_line3` VARCHAR(255) DEFAULT '',
    `address_line4` VARCHAR(255) DEFAULT '',
    `village` VARCHAR(255) DEFAULT '',
    `telephone` VARCHAR(255) DEFAULT '',
    `mobile` VARCHAR(255) DEFAULT '',
    `email` VARCHAR(255) DEFAULT '',
    `note` VARCHAR(255) DEFAULT '',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Financial & Ledger Tables

DROP TABLE IF EXISTS `ledger_categories`;
CREATE TABLE `ledger_categories` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `value` VARCHAR(255) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ledger_categories_value_unique` (`value`),
    UNIQUE KEY `ledger_categories_label_unique` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ledger_accounts`;
CREATE TABLE `ledger_accounts` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `date` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `under` TEXT,
    `current_balance` DECIMAL(10, 2) DEFAULT 0,
    `address` TEXT,
    `city` TEXT,
    `phone` TEXT,
    `mobile` TEXT,
    `email` TEXT,
    `note` TEXT,
    `type` ENUM('credit', 'debit') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ledger_entries`;
CREATE TABLE `ledger_entries` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `date` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `under` TEXT,
    `type` ENUM('credit', 'debit') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `address` TEXT,
    `city` TEXT,
    `phone` TEXT,
    `mobile` TEXT,
    `email` TEXT,
    `note` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `registration_id` INT,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `journal_entries`;
CREATE TABLE `journal_entries` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `date` TEXT NOT NULL,
    `from_account` TEXT NOT NULL,
    `to_account` TEXT NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `entry_type` ENUM('transfer', 'receipt', 'payment', 'donation', 'adjustment') NOT NULL,
    `reference_type` TEXT,
    `reference_id` INT,
    `remarks` TEXT,
    `temple_id` INT,
    `created_by` INT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `receipts`;
CREATE TABLE `receipts` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `register_no` TEXT NOT NULL,
    `date` TEXT NOT NULL,
    `type` TEXT NOT NULL,
    `from_person` TEXT,
    `to_person` TEXT,
    `amount` DECIMAL(10,2) NOT NULL,
    `remarks` TEXT,
    `created_by` INT,  -- ✅ FIXED: Allow NULL for SET NULL FK
    `temple_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `receipt_counter`;
CREATE TABLE `receipt_counter` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `year` INT NOT NULL,
    `last_number` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `receipt_counter_year_unique` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donations & Annadhanam

DROP TABLE IF EXISTS `donation_products`;
CREATE TABLE `donation_products` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `value` VARCHAR(255) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `unit` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME,
    PRIMARY KEY (`id`),
    UNIQUE KEY `donation_products_value_unique` (`value`),
    UNIQUE KEY `donation_products_label_unique` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: TEXT DEFAULT → VARCHAR
DROP TABLE IF EXISTS `donations`;
CREATE TABLE `donations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL,
    `product_name` VARCHAR(255) DEFAULT 'General Donation',
    `description` TEXT,
    `price` DECIMAL(10,2) DEFAULT 0,
    `quantity` INT DEFAULT 1,
    `category` VARCHAR(100) DEFAULT 'General',
    `donor_name` VARCHAR(255) DEFAULT 'Anonymous',
    `donor_contact` TEXT,
    `donation_date` DATE DEFAULT (CURDATE()),
    `status` ENUM('available', 'reserved', 'distributed') DEFAULT 'available',
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `approval_status` ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
    `submitted_by_mobile` TEXT,
    `submitted_at` DATETIME NULL,
    `approved_by` INT,  -- ✅ Allow NULL
    `approved_at` DATETIME NULL,
    `rejection_reason` TEXT,
    `admin_notes` TEXT,
    `transfer_to_account` TEXT,
    `register_no` TEXT,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL  -- ✅ Compatible
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `donations_approval_logs`;
CREATE TABLE `donations_approval_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `donation_id` INT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `performed_by` INT,
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT,
    `old_status` VARCHAR(255),
    `new_status` VARCHAR(255),
    PRIMARY KEY (`id`),
    FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: created_by, approved_by → nullable
DROP TABLE IF EXISTS `annadhanam`;
CREATE TABLE `annadhanam` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL DEFAULT 1,
    `receipt_number` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `mobile_number` VARCHAR(255) NOT NULL,
    `food` TEXT NOT NULL,
    `peoples` INT NOT NULL,
    `time` VARCHAR(255) NOT NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `remarks` TEXT,
    `created_by` INT,  -- ✅ Allow NULL
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
    `submitted_by_mobile` TEXT,
    `submitted_at` DATETIME NULL,
    `approved_at` DATETIME NULL,
    `rejection_reason` TEXT,
    `admin_notes` TEXT,
    `approved_by` INT,  -- ✅ Allow NULL
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `annadhanam_approval_logs`;
CREATE TABLE `annadhanam_approval_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `annadhanam_id` INT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `performed_by` INT,
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT,
    `old_status` VARCHAR(255),
    `new_status` VARCHAR(255),
    PRIMARY KEY (`id`),
    FOREIGN KEY (`annadhanam_id`) REFERENCES `annadhanam`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pooja — ✅ FIXED created_by, approved_by

DROP TABLE IF EXISTS `pooja`;
CREATE TABLE `pooja` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL DEFAULT 1,
    `receipt_number` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `mobile_number` VARCHAR(255) NOT NULL,
    `time` VARCHAR(255) NOT NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `remarks` TEXT,
    `created_by` INT,  -- ✅ Allow NULL
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
    `submitted_by_mobile` TEXT,
    `approved_by` INT,  -- ✅ Allow NULL
    `approved_at` DATETIME NULL,
    `rejection_reason` TEXT,
    `admin_notes` TEXT,
    `submitted_at` DATETIME NULL,
    `transfer_to_account` TEXT,
    `amount` DECIMAL(10,2),
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pooja_approval_logs`;
CREATE TABLE `pooja_approval_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `pooja_id` INT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `performed_by` INT,
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT,
    `old_status` VARCHAR(255),
    `new_status` VARCHAR(255),
    PRIMARY KEY (`id`),
    FOREIGN KEY (`pooja_id`) REFERENCES `pooja`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: status TEXT → VARCHAR
DROP TABLE IF EXISTS `pooja_payments`;
CREATE TABLE `pooja_payments` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT,
    `year` INT,
    `total_amount` DECIMAL(10,2) DEFAULT 0,
    `paid_amount` DECIMAL(10,2) DEFAULT 0,
    `status` VARCHAR(50) DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marriage & Hall Bookings — ✅ FIXED created_by, approved_by

DROP TABLE IF EXISTS `kanikalar`;
CREATE TABLE `kanikalar` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `bride_name` TEXT NOT NULL,
    `groom_name` TEXT NOT NULL,
    `wedding_date` TEXT NOT NULL,
    `venue` TEXT NOT NULL,
    `contact_number` TEXT,
    `email` TEXT,
    `temple_id` INT NOT NULL,
    `created_by` INT,  -- ✅ Allow NULL (was NOT NULL)
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL  -- ✅ Compatible
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: created_by → nullable
DROP TABLE IF EXISTS `wedding_events`;
CREATE TABLE `wedding_events` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `kanikalar_id` INT NOT NULL,
    `event_name` TEXT NOT NULL,
    `event_date` TEXT NOT NULL,
    `event_time` TEXT NOT NULL,
    `location` TEXT NOT NULL,
    `description` TEXT,
    `created_by` INT,  -- ✅ Allow NULL
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`kanikalar_id`) REFERENCES `kanikalar`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: approved_by → nullable
DROP TABLE IF EXISTS `marriage_hall_bookings`;
CREATE TABLE `marriage_hall_bookings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL DEFAULT 1,
    `register_no` VARCHAR(255),
    `date` VARCHAR(255),
    `time` VARCHAR(255),
    `event` VARCHAR(255),
    `subdivision` VARCHAR(255),
    `name` VARCHAR(255),
    `address` VARCHAR(255),
    `village` VARCHAR(255),
    `mobile` VARCHAR(255),
    `advance_amount` VARCHAR(255),
    `total_amount` VARCHAR(255),
    `balance_amount` VARCHAR(255),
    `remarks` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
    `submitted_by_mobile` TEXT,
    `approved_by` INT,  -- ✅ Allow NULL
    `approved_at` DATETIME NULL,
    `rejection_reason` TEXT,
    `admin_notes` TEXT,
    `submitted_at` DATETIME NULL,
    `transfer_to_account` TEXT,
    `hall_id` INT,
    `event_id` INT,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `hall_approval_logs`;
CREATE TABLE `hall_approval_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `booking_id` INT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `performed_by` INT,
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT,
    `old_status` VARCHAR(255),
    `new_status` VARCHAR(255),
    PRIMARY KEY (`id`),
    FOREIGN KEY (`booking_id`) REFERENCES `marriage_hall_bookings`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `marriage_registers`;
CREATE TABLE `marriage_registers` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL DEFAULT 1,
    `register_no` VARCHAR(255),
    `date` VARCHAR(255),
    `time` VARCHAR(255),
    `event` VARCHAR(255),
    `groom_name` VARCHAR(255),
    `bride_name` VARCHAR(255),
    `address` VARCHAR(255),
    `village` VARCHAR(255),
    `guardian_name` VARCHAR(255),
    `witness_one` VARCHAR(255),
    `witness_two` VARCHAR(255),
    `remarks` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `amount` INT DEFAULT 0,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events & Media — ✅ FIXED created_by

DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `title` TEXT NOT NULL,
    `description` TEXT,
    `date` TEXT NOT NULL,
    `time` TEXT NOT NULL,
    `location` TEXT NOT NULL,
    `temple_id` INT NOT NULL,
    `created_by` INT,  -- ✅ Allow NULL
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `event_images`;
CREATE TABLE `event_images` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `event_id` INT NOT NULL,
    `image_path` TEXT NOT NULL,
    `uploaded_by` INT,
    `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `title` TEXT,
    `caption` TEXT,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax & User Registrations — ✅ FIXED approved_by

DROP TABLE IF EXISTS `tax_settings`;
CREATE TABLE `tax_settings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL,
    `year` INT NOT NULL,
    `tax_amount` FLOAT NOT NULL,
    `description` VARCHAR(255),
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `include_previous_years` BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `tax_settings_temple_id_year_unique` (`temple_id`, `year`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_registrations`;
CREATE TABLE `user_registrations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `reference_number` VARCHAR(255),
    `date` VARCHAR(255),
    `subdivision` VARCHAR(255),
    `name` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255),
    `email` VARCHAR(255),
    `alternative_name` VARCHAR(255),
    `wife_name` VARCHAR(255),
    `education` VARCHAR(255),
    `occupation` VARCHAR(255),
    `father_name` VARCHAR(255),
    `address` VARCHAR(255),
    `birth_date` VARCHAR(255),
    `village` VARCHAR(255),
    `mobile_number` VARCHAR(255),
    `aadhaar_number` VARCHAR(255),
    `pan_number` VARCHAR(255),
    `clan` VARCHAR(255),
    `group` VARCHAR(255),
    `postal_code` VARCHAR(255),
    `male_heirs` INT DEFAULT 0,
    `female_heirs` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `photo_path` TEXT,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_heirs`;
CREATE TABLE `user_heirs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `registration_id` INT NOT NULL,
    `serial_number` INT NOT NULL DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `race` VARCHAR(255),
    `marital_status` VARCHAR(255),
    `education` VARCHAR(255),
    `birth_date` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`registration_id`) REFERENCES `user_registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tax_payments`;
CREATE TABLE `tax_payments` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `year` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paid_amount` DECIMAL(10, 2) DEFAULT 0,
    `status` ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `user_registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: approved_by → nullable
DROP TABLE IF EXISTS `user_tax_registrations`;
CREATE TABLE `user_tax_registrations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT DEFAULT 1,
    `reference_number` VARCHAR(255),
    `date` VARCHAR(255),
    `subdivision` VARCHAR(255),
    `name` VARCHAR(255) NOT NULL,
    `alternative_name` VARCHAR(255),
    `wife_name` VARCHAR(255),
    `education` VARCHAR(255),
    `occupation` VARCHAR(255),
    `father_name` VARCHAR(255),
    `address` VARCHAR(255),
    `birth_date` VARCHAR(255),
    `village` VARCHAR(255),
    `mobile_number` VARCHAR(255),
    `aadhaar_number` VARCHAR(255),
    `pan_number` VARCHAR(255),
    `clan` VARCHAR(255),
    `group` VARCHAR(255),
    `postal_code` VARCHAR(255),
    `male_heirs` INT DEFAULT 0,
    `female_heirs` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `amount_paid` DECIMAL(10, 2) DEFAULT 0,
    `outstanding_amount` DECIMAL(10, 2) DEFAULT 0,
    `is_approved` BOOLEAN DEFAULT FALSE,
    `approved_by` INT,  -- ✅ Allow NULL
    `approved_at` DATETIME NULL,
    `note` TEXT,
    `year` INT,
    `tax_amount` DECIMAL(10, 2) DEFAULT 0,
    `transfer_to_account` TEXT,
    `donation_amount` DECIMAL(10, 2) DEFAULT 0,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Money Donations & Properties — ✅ FIXED created_by

DROP TABLE IF EXISTS `money_donations`;
CREATE TABLE `money_donations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `register_no` VARCHAR(255),
    `date` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255),
    `father_name` VARCHAR(255),
    `address` VARCHAR(255),
    `village` VARCHAR(255),
    `phone` VARCHAR(255),
    `amount` FLOAT NOT NULL,
    `reason` VARCHAR(255),
    `temple_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `transfer_to_account` TEXT,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ FIXED: created_by → nullable
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` TEXT NOT NULL,
    `details` TEXT NOT NULL,
    `value` TEXT NOT NULL,
    `created_by` INT,  -- ✅ Allow NULL
    `temple_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PDF Settings

DROP TABLE IF EXISTS `pdf_settings`;
CREATE TABLE `pdf_settings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `temple_id` INT NOT NULL,
    `title_main` VARCHAR(255),
    `title_sub` VARCHAR(255),
    `title_line2` VARCHAR(512),
    `subheader` VARCHAR(255),
    `logo_url` VARCHAR(512),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `tax_subheader` VARCHAR(255),
    `annadhanam_subheader` VARCHAR(255),
    `hall_subheader` VARCHAR(255),
    `watermark_text` VARCHAR(255),
    `annadhanam_receipt_label` VARCHAR(255),
    `annadhanam_date_label` VARCHAR(255),
    `annadhanam_year_label` VARCHAR(255),
    `annadhanam_cell_label` VARCHAR(255),
    `annadhanam_collector_label` VARCHAR(255),
    PRIMARY KEY (`id`),
    UNIQUE KEY `pdf_settings_temple_id_unique` (`temple_id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- External DBs (if used)

DROP TABLE IF EXISTS `external_temple_databases`;
CREATE TABLE `external_temple_databases` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `db_path` VARCHAR(255) NOT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'active',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Table

DROP TABLE IF EXISTS `sample_table`;
CREATE TABLE `sample_table` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create View

DROP VIEW IF EXISTS `profit_and_loss`;
CREATE VIEW `profit_and_loss` AS
SELECT 
    DATE_FORMAT(STR_TO_DATE(`date`, '%Y-%m-%d'), '%Y-%m') as `month`,
    SUM(CASE WHEN `type` = 'credit' THEN `amount` ELSE 0 END) as `total_income`,
    SUM(CASE WHEN `type` = 'debit' THEN `amount` ELSE 0 END) as `total_expenses`,
    (SUM(CASE WHEN `type` = 'credit' THEN `amount` ELSE 0 END) - 
     SUM(CASE WHEN `type` = 'debit' THEN `amount` ELSE 0 END)) as `net_profit_loss`
FROM 
    `ledger_entries`
GROUP BY 
    DATE_FORMAT(STR_TO_DATE(`date`, '%Y-%m-%d'), '%Y-%m')
ORDER BY 
    `month` DESC;

-- Create Indexes

CREATE INDEX `idx_annadhanam_temple` ON `annadhanam` (`temple_id`);
CREATE INDEX `idx_annadhanam_receipt_number` ON `annadhanam` (`receipt_number`);
CREATE INDEX `idx_annadhanam_name` ON `annadhanam` (`name`);
CREATE INDEX `idx_annadhanam_mobile` ON `annadhanam` (`mobile_number`);
CREATE INDEX `idx_annadhanam_from_date` ON `annadhanam` (`from_date`);
CREATE INDEX `idx_annadhanam_to_date` ON `annadhanam` (`to_date`);

CREATE INDEX `idx_pooja_temple` ON `pooja` (`temple_id`);
CREATE INDEX `idx_pooja_receipt_number` ON `pooja` (`receipt_number`);
CREATE INDEX `idx_pooja_name` ON `pooja` (`name`);
CREATE INDEX `idx_pooja_mobile` ON `pooja` (`mobile_number`);
CREATE INDEX `idx_pooja_from_date` ON `pooja` (`from_date`);
CREATE INDEX `idx_pooja_to_date` ON `pooja` (`to_date`);

CREATE INDEX `idx_donations_temple` ON `donations` (`temple_id`);
CREATE INDEX `idx_donations_date` ON `donations` (`donation_date`);

CREATE INDEX `idx_hall_bookings_temple` ON `marriage_hall_bookings` (`temple_id`);
CREATE INDEX `idx_hall_bookings_date` ON `marriage_hall_bookings` (`date`);

CREATE INDEX `idx_events_temple` ON `events` (`temple_id`);
CREATE INDEX `idx_events_date` ON `events` (`date`(10));

CREATE INDEX `idx_journal_entries_temple` ON `journal_entries` (`temple_id`);
CREATE INDEX `idx_journal_entries_date` ON `journal_entries` (`date`(10));

CREATE INDEX `idx_ledger_entries_date` ON `ledger_entries` (`date`(10));
CREATE INDEX `idx_receipts_temple_id` ON `receipts` (`temple_id`);
CREATE INDEX `idx_receipts_date` ON `receipts` (`date`(10));
CREATE INDEX `idx_properties_temple_id` ON `properties` (`temple_id`);

CREATE INDEX `idx_user_registrations_temple` ON `user_registrations` (`temple_id`);
CREATE INDEX `idx_user_tax_registrations_temple` ON `user_tax_registrations` (`temple_id`);

CREATE INDEX `idx_tax_payments_user` ON `tax_payments` (`user_id`);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;