-- MySQL Schema for Temple Management System (converted from server/asdschema.sqlite3.sql)
-- Engine: InnoDB, Charset: utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Core reference tables first (to satisfy FKs)
DROP TABLE IF EXISTS `temples`;
CREATE TABLE `temples` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `registration_id` VARCHAR(255),
  `address` TEXT,
  `phone` TEXT,
  `email` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(50),
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `temple_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activity logs
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL,
  `actor_user_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `target_table` VARCHAR(255) DEFAULT NULL,
  `target_id` INT DEFAULT NULL,
  `details` TEXT,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Annadhanam and related logs
DROP TABLE IF EXISTS `annadhanam`;
CREATE TABLE `annadhanam` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL DEFAULT '1',
  `receipt_number` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `mobile_number` VARCHAR(255) NOT NULL,
  `food` TEXT NOT NULL,
  `peoples` INT NOT NULL,
  `time` VARCHAR(255) NOT NULL,
  `from_date` DATE NOT NULL,
  `to_date` DATE NOT NULL,
  `remarks` TEXT,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` ENUM('pending','approved','rejected','cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `approved_by` INT DEFAULT NULL,
  KEY `annadhanam_temple_id_idx` (`temple_id`),
  KEY `annadhanam_receipt_number_idx` (`receipt_number`),
  KEY `annadhanam_name_idx` (`name`),
  KEY `annadhanam_mobile_number_idx` (`mobile_number`),
  KEY `annadhanam_from_date_idx` (`from_date`),
  KEY `annadhanam_to_date_idx` (`to_date`),
  CONSTRAINT `annadhanam_fk_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `annadhanam_fk_temple` FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `annadhanam_approval_logs`;
CREATE TABLE `annadhanam_approval_logs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `annadhanam_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `performed_by` INT DEFAULT NULL,
  `performed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `old_status` VARCHAR(255) DEFAULT NULL,
  `new_status` VARCHAR(255) DEFAULT NULL,
  KEY `annadhanam_approval_logs_annadhanam_id_idx` (`annadhanam_id`),
  KEY `annadhanam_approval_logs_action_idx` (`action`),
  CONSTRAINT `annadhanam_approval_logs_fk_annadhanam` FOREIGN KEY (`annadhanam_id`) REFERENCES `annadhanam`(`id`) ON DELETE CASCADE,
  CONSTRAINT `annadhanam_approval_logs_fk_user` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donations and related logs
DROP TABLE IF EXISTS `donation_products`;
CREATE TABLE `donation_products` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `value` VARCHAR(255) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY `donation_products_value_unique` (`value`),
  UNIQUE KEY `donation_products_label_unique` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `donations`;
CREATE TABLE `donations` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL,
  `product_name` VARCHAR(255) DEFAULT 'General Donation',
  `description` TEXT,
  `price` DECIMAL(10,2) DEFAULT 0,
  `quantity` INT DEFAULT 1,
  `category` VARCHAR(100) DEFAULT 'General',
  `donor_name` VARCHAR(255) DEFAULT 'Anonymous',
  `donor_contact` TEXT,
  `donation_date` DATE DEFAULT (CURRENT_DATE),
  `status` ENUM('available','reserved','distributed') DEFAULT 'available',
  `notes` TEXT,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approval_status` ENUM('pending','approved','rejected','cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `approved_by` INT DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `transfer_to_account` TEXT,
  `register_no` TEXT,
  KEY `donations_approved_by_idx` (`approved_by`),
  CONSTRAINT `donations_fk_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `donations_approval_logs`;
CREATE TABLE `donations_approval_logs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `donation_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `performed_by` INT DEFAULT NULL,
  `performed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `old_status` VARCHAR(255) DEFAULT NULL,
  `new_status` VARCHAR(255) DEFAULT NULL,
  KEY `donations_approval_logs_donation_id_idx` (`donation_id`),
  KEY `donations_approval_logs_action_idx` (`action`),
  CONSTRAINT `donations_approval_logs_fk_donation` FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `donations_approval_logs_fk_user` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Events
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` TEXT NOT NULL,
  `description` TEXT,
  `date` TEXT NOT NULL,
  `time` TEXT NOT NULL,
  `location` TEXT NOT NULL,
  `temple_id` INT NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `events_fk_temple` FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  CONSTRAINT `events_fk_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `event_images`;
CREATE TABLE `event_images` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `event_id` INT NOT NULL,
  `image_path` TEXT NOT NULL,
  `uploaded_by` INT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `title` TEXT,
  `caption` TEXT,
  CONSTRAINT `event_images_fk_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  CONSTRAINT `event_images_fk_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Accounting / Ledger
DROP TABLE IF EXISTS `journal_entries`;
CREATE TABLE `journal_entries` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `date` TEXT NOT NULL,
  `from_account` TEXT NOT NULL,
  `to_account` TEXT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `entry_type` ENUM('transfer','receipt','payment','donation','adjustment') NOT NULL,
  `reference_type` TEXT,
  `reference_id` INT,
  `remarks` TEXT,
  `temple_id` INT,
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_journal_date` (`date`),
  KEY `idx_journal_from` (`from_account`(191)),
  KEY `idx_journal_to` (`to_account`(191)),
  KEY `idx_journal_temple` (`temple_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `ledger_accounts`;
CREATE TABLE `ledger_accounts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `date` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `under` TEXT,
  `current_balance` DECIMAL(10,2) DEFAULT 0,
  `address` TEXT,
  `city` TEXT,
  `phone` TEXT,
  `mobile` TEXT,
  `email` TEXT,
  `note` TEXT,
  `type` ENUM('credit','debit') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_ledger_accounts_date` (`date`),
  KEY `idx_ledger_accounts_name` (`name`(191)),
  KEY `idx_ledger_accounts_under` (`under`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `ledger_categories`;
CREATE TABLE `ledger_categories` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `value` VARCHAR(255) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  UNIQUE KEY `ledger_categories_value_unique` (`value`),
  UNIQUE KEY `ledger_categories_label_unique` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `ledger_entries`;
CREATE TABLE `ledger_entries` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `date` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `under` TEXT,
  `type` ENUM('credit','debit') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `address` TEXT,
  `city` TEXT,
  `phone` TEXT,
  `mobile` TEXT,
  `email` TEXT,
  `note` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `registration_id` INT,
  KEY `idx_ledger_entries_date` (`date`),
  KEY `idx_ledger_entries_name` (`name`(191)),
  KEY `idx_ledger_entries_under` (`under`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Master data
DROP TABLE IF EXISTS `master_clans`;
CREATE TABLE `master_clans` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_educations`;
CREATE TABLE `master_educations` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_groups`;
CREATE TABLE `master_groups` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_hall_events`;
CREATE TABLE `master_hall_events` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_halls`;
CREATE TABLE `master_halls` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `base_price` FLOAT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_occupations`;
CREATE TABLE `master_occupations` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_people`;
CREATE TABLE `master_people` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
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
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_records`;
CREATE TABLE `master_records` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
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
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `master_villages`;
CREATE TABLE `master_villages` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Marriage related
DROP TABLE IF EXISTS `marriage_registers`;
CREATE TABLE `marriage_registers` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL DEFAULT '1',
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
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `amount` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `marriage_hall_bookings`;
CREATE TABLE `marriage_hall_bookings` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL DEFAULT '1',
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
  `status` ENUM('pending','approved','rejected','cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `approved_by` INT,
  `approved_at` TIMESTAMP,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `submitted_at` TIMESTAMP,
  `transfer_to_account` TEXT,
  `hall_id` INT,
  `event_id` INT,
  KEY `hall_approval_bookings_temple_idx` (`temple_id`),
  CONSTRAINT `marriage_hall_bookings_fk_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `hall_approval_logs`;
CREATE TABLE `hall_approval_logs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `performed_by` INT,
  `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `old_status` VARCHAR(255),
  `new_status` VARCHAR(255),
  KEY `hall_approval_logs_booking_id_idx` (`booking_id`),
  KEY `hall_approval_logs_action_idx` (`action`),
  CONSTRAINT `hall_approval_logs_fk_booking` FOREIGN KEY (`booking_id`) REFERENCES `marriage_hall_bookings`(`id`) ON DELETE CASCADE,
  CONSTRAINT `hall_approval_logs_fk_user` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pooja and approvals
DROP TABLE IF EXISTS `pooja`;
CREATE TABLE `pooja` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL DEFAULT '1',
  `receipt_number` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `mobile_number` VARCHAR(255) NOT NULL,
  `time` VARCHAR(255) NOT NULL,
  `from_date` DATE NOT NULL,
  `to_date` DATE NOT NULL,
  `remarks` TEXT,
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` ENUM('pending','approved','rejected','cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `approved_by` INT,
  `approved_at` TIMESTAMP,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `submitted_at` TIMESTAMP,
  `transfer_to_account` TEXT,
  `amount` DECIMAL(10,2),
  KEY `pooja_temple_id_idx` (`temple_id`),
  KEY `pooja_receipt_number_idx` (`receipt_number`),
  KEY `pooja_name_idx` (`name`),
  KEY `pooja_mobile_idx` (`mobile_number`),
  KEY `pooja_from_date_idx` (`from_date`),
  KEY `pooja_to_date_idx` (`to_date`),
  CONSTRAINT `pooja_fk_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `pooja_fk_temple` FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pooja_fk_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `pooja_approval_logs`;
CREATE TABLE `pooja_approval_logs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `pooja_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `performed_by` INT,
  `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `old_status` VARCHAR(255),
  `new_status` VARCHAR(255),
  KEY `pooja_approval_logs_pooja_id_idx` (`pooja_id`),
  KEY `pooja_approval_logs_action_idx` (`action`),
  CONSTRAINT `pooja_approval_logs_fk_pooja` FOREIGN KEY (`pooja_id`) REFERENCES `pooja`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pooja_approval_logs_fk_user` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Properties
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `details` TEXT NOT NULL,
  `value` TEXT NOT NULL,
  `created_by` INT NOT NULL,
  `temple_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_properties_temple_id` (`temple_id`),
  KEY `idx_properties_created_by` (`created_by`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Receipts and counter
DROP TABLE IF EXISTS `receipt_counter`;
CREATE TABLE `receipt_counter` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `year` INT NOT NULL,
  `last_number` INT NOT NULL DEFAULT 0,
  UNIQUE KEY `uniq_receipt_counter_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `receipts`;
CREATE TABLE `receipts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `register_no` TEXT NOT NULL,
  `date` TEXT NOT NULL,
  `type` TEXT NOT NULL,
  `from_person` TEXT,
  `to_person` TEXT,
  `amount` DECIMAL(10,2) NOT NULL,
  `remarks` TEXT,
  `created_by` INT NOT NULL,
  `temple_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_receipts_register_no` (`register_no`(191)),
  KEY `idx_receipts_date` (`date`),
  KEY `idx_receipts_temple_id` (`temple_id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Permissions and roles
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` VARCHAR(191) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `role_id` VARCHAR(191) NOT NULL,
  `permission_id` VARCHAR(191) NOT NULL,
  `access_level` VARCHAR(50) NOT NULL,
  KEY `idx_role_permissions_role` (`role_id`),
  KEY `idx_role_permissions_permission` (`permission_id`),
  CONSTRAINT `role_permissions_fk_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `permission_id` VARCHAR(255) NOT NULL,
  `access_level` ENUM('full','view','none') DEFAULT 'none',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `user_permissions_user_id_permission_id_unique` (`user_id`, `permission_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tax
DROP TABLE IF EXISTS `tax_payments`;
CREATE TABLE `tax_payments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `year` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `paid_amount` DECIMAL(10, 2) DEFAULT 0,
  `status` ENUM('pending','partial','paid') DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `user_registrations`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `tax_settings`;
CREATE TABLE `tax_settings` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL,
  `year` INT NOT NULL,
  `tax_amount` FLOAT NOT NULL,
  `description` VARCHAR(255),
  `is_active` BOOLEAN DEFAULT '1',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `include_previous_years` BOOLEAN DEFAULT '0',
  UNIQUE KEY `tax_settings_temple_id_year_unique` (`temple_id`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings
DROP TABLE IF EXISTS `pdf_settings`;
CREATE TABLE `pdf_settings` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
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
  UNIQUE KEY `pdf_settings_temple_id_unique` (`temple_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `key` VARCHAR(255) PRIMARY KEY,
  `value` TEXT,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `external_temple_databases`;
CREATE TABLE `external_temple_databases` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `db_path` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User domain
DROP TABLE IF EXISTS `user_settings`;
CREATE TABLE `user_settings` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `landing_route` VARCHAR(255) DEFAULT '/dashboard',
  `sidebar_collapsed_default` BOOLEAN NOT NULL DEFAULT '0',
  `hidden_menu_keys` TEXT,
  `quick_actions` TEXT,
  `language` VARCHAR(32),
  `theme` VARCHAR(32),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `user_settings_user_id_unique` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `user_heirs`;
CREATE TABLE `user_heirs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `registration_id` INT NOT NULL,
  `serial_number` INT NOT NULL DEFAULT '1',
  `name` VARCHAR(255) NOT NULL,
  `race` VARCHAR(255),
  `marital_status` VARCHAR(255),
  `education` VARCHAR(255),
  `birth_date` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`registration_id`) REFERENCES `user_registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `user_registrations`;
CREATE TABLE `user_registrations` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT DEFAULT '1',
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
  `male_heirs` INT DEFAULT '0',
  `female_heirs` INT DEFAULT '0',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `photo_path` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `pooja_payments`;
CREATE TABLE `pooja_payments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `year` INT,
  `total_amount` DECIMAL(10,2) DEFAULT 0,
  `paid_amount` DECIMAL(10,2) DEFAULT 0,
  `status` VARCHAR(20) DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kanikalar (wedding registry)
DROP TABLE IF EXISTS `kanikalar`;
CREATE TABLE `kanikalar` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `bride_name` TEXT NOT NULL,
  `groom_name` TEXT NOT NULL,
  `wedding_date` TEXT NOT NULL,
  `venue` TEXT NOT NULL,
  `contact_number` TEXT,
  `email` TEXT,
  `temple_id` INT NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `wedding_events`;
CREATE TABLE `wedding_events` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `kanikalar_id` INT NOT NULL,
  `event_name` TEXT NOT NULL,
  `event_date` TEXT NOT NULL,
  `event_time` TEXT NOT NULL,
  `location` TEXT NOT NULL,
  `description` TEXT,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`kanikalar_id`) REFERENCES `kanikalar`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Money donations
DROP TABLE IF EXISTS `money_donations`;
CREATE TABLE `money_donations` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
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
  `transfer_to_account` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrations tables
DROP TABLE IF EXISTS `knex_migrations`;
CREATE TABLE `knex_migrations` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255),
  `batch` INT,
  `migration_time` DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `knex_migrations_lock`;
CREATE TABLE `knex_migrations_lock` (
  `index` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `is_locked` INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Logs
DROP TABLE IF EXISTS `session_logs`;
CREATE TABLE `session_logs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `login_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `logout_time` DATETIME,
  `ip_address` VARCHAR(255) NOT NULL,
  `user_agent` VARCHAR(255),
  `duration_seconds` INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `superadmin_logs`;
CREATE TABLE `superadmin_logs` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(255) NOT NULL,
  `user_agent` VARCHAR(255),
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample table from SQLite (kept for parity)
DROP TABLE IF EXISTS `sample_table`;
CREATE TABLE `sample_table` (
  `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- View: profit and loss
DROP VIEW IF EXISTS `profit_and_loss`;
CREATE VIEW `profit_and_loss` AS
SELECT 
  DATE_FORMAT(date, '%Y-%m') AS month,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_expenses,
  (SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) - 
   SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END)) AS net_profit_loss
FROM ledger_entries
GROUP BY DATE_FORMAT(date, '%Y-%m')
ORDER BY month DESC;

SET FOREIGN_KEY_CHECKS = 1;
