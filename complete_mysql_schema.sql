-- MySQL Schema for Temples Database
-- Converted from SQLite to MySQL
-- Total Tables: 51

-- Drop tables if they exist (optional, uncomment if needed)
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE IF EXISTS activity_logs, annadhanam, annadhanam_approval_logs, donation_products, donations, donations_approval_logs, event_images, events, external_temple_databases, hall_approval_logs, journal_entries, kanikalar, knex_migrations, knex_migrations_lock, ledger_accounts, ledger_categories, ledger_entries, marriage_hall_bookings, marriage_registers, master_clans, master_educations, master_groups, master_hall_events, master_halls, master_occupations, master_people, master_records, master_villages, money_donations, pdf_settings, permissions, pooja, pooja_approval_logs, pooja_payments, profit_and_loss, properties, receipts, role_permissions, session_logs, superadmin_logs, system_settings, tax_payments, tax_settings, temples, user_heirs, user_permissions, user_registrations, user_settings, user_tax_registrations, users, wedding_events;
-- SET FOREIGN_KEY_CHECKS = 1;

-- Core Tables
CREATE TABLE `temples` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `registration_id` VARCHAR(255),
  `address` TEXT,
  `phone` TEXT,
  `email` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users and Authentication
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255),
  `email` VARCHAR(255) UNIQUE,
  `phone` VARCHAR(20),
  `role` VARCHAR(50) DEFAULT 'user',
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Master Data Tables
CREATE TABLE `master_clans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_educations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_halls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `capacity` INT,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_hall_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `duration_hours` INT DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_occupations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_people` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `gender` VARCHAR(10),
  `dob` DATE,
  `address` TEXT,
  `village` VARCHAR(255),
  `mobile` VARCHAR(20),
  `email` VARCHAR(255),
  `note` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `under` VARCHAR(255) NOT NULL,
  `opening_balance` DECIMAL(15,2) DEFAULT 0.00,
  `balance_type` ENUM('credit', 'debit') DEFAULT 'credit',
  `address_line1` VARCHAR(255) DEFAULT '',
  `address_line2` VARCHAR(255) DEFAULT '',
  `address_line3` VARCHAR(255) DEFAULT '',
  `address_line4` VARCHAR(255) DEFAULT '',
  `village` VARCHAR(255) DEFAULT '',
  `telephone` VARCHAR(20) DEFAULT '',
  `mobile` VARCHAR(20) DEFAULT '',
  `email` VARCHAR(255) DEFAULT '',
  `note` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_villages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Management
CREATE TABLE `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `permission_id` VARCHAR(255) NOT NULL,
  `access_level` ENUM('full', 'view', 'none') DEFAULT 'none',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `user_permissions_user_id_permission_id_unique` (`user_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Permissions
CREATE TABLE `role_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role` VARCHAR(50) NOT NULL,
  `permission_id` VARCHAR(255) NOT NULL,
  `access_level` ENUM('full', 'view', 'none') DEFAULT 'none',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `role_permissions_role_permission_id_unique` (`role`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donations and Payments
CREATE TABLE `donations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `receipt_no` VARCHAR(50) NOT NULL,
  `donor_name` VARCHAR(255) NOT NULL,
  `donor_address` TEXT,
  `donor_phone` VARCHAR(20),
  `donor_email` VARCHAR(255),
  `donation_date` DATE NOT NULL,
  `donation_type` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_mode` VARCHAR(50) NOT NULL,
  `cheque_no` VARCHAR(100),
  `cheque_date` DATE,
  `bank_name` VARCHAR(255),
  `reference_no` VARCHAR(100),
  `purpose` TEXT,
  `remarks` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `money_donations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `donation_id` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `purpose` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pooja and Events
CREATE TABLE `pooja` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `duration_minutes` INT DEFAULT 60,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pooja_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `pooja_id` INT NOT NULL,
  `devotee_name` VARCHAR(255) NOT NULL,
  `devotee_phone` VARCHAR(20),
  `pooja_date` DATE NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_status` ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  `payment_mode` VARCHAR(50),
  `transaction_id` VARCHAR(100),
  `notes` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`pooja_id`) REFERENCES `pooja`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ledger and Accounting
CREATE TABLE `ledger_accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50),
  `type` ENUM('asset', 'liability', 'income', 'expense', 'equity') NOT NULL,
  `parent_id` INT,
  `opening_balance` DECIMAL(15,2) DEFAULT 0.00,
  `balance_type` ENUM('debit', 'credit') DEFAULT 'debit',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_id`) REFERENCES `ledger_accounts`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ledger_entries` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `voucher_no` VARCHAR(100) NOT NULL,
  `voucher_type` VARCHAR(50) NOT NULL,
  `reference_id` INT,
  `reference_type` VARCHAR(100),
  `narration` TEXT,
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `journal_entries` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `entry_id` BIGINT NOT NULL,
  `ledger_account_id` INT NOT NULL,
  `debit` DECIMAL(15,2) DEFAULT 0.00,
  `credit` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`entry_id`) REFERENCES `ledger_entries`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ledger_account_id`) REFERENCES `ledger_accounts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Tables
CREATE TABLE `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `system_settings_temple_id_setting_key_unique` (`temple_id`, `setting_key`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity Logs
CREATE TABLE `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `actor_user_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `target_table` VARCHAR(255),
  `target_id` INT,
  `details` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Annadhanam
CREATE TABLE `annadhanam` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `donor_name` VARCHAR(255) NOT NULL,
  `donation_date` DATE NOT NULL,
  `no_of_people` INT DEFAULT 0,
  `amount` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `donor_contact` VARCHAR(50),
  `donor_address` TEXT,
  `approved_by` INT,
  `approved_at` DATETIME,
  `rejection_reason` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Annadhanam Approval Logs
CREATE TABLE `annadhanam_approval_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `annadhanam_id` INT NOT NULL,
  `action` ENUM('approved', 'rejected') NOT NULL,
  `action_by` INT NOT NULL,
  `reason` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`annadhanam_id`) REFERENCES `annadhanam`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donation Products
CREATE TABLE `donation_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `unit` VARCHAR(50),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donation Approval Logs
CREATE TABLE `donations_approval_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `donation_id` INT NOT NULL,
  `action` ENUM('approved', 'rejected') NOT NULL,
  `action_by` INT NOT NULL,
  `reason` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events
CREATE TABLE `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME,
  `location` VARCHAR(255),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event Images
CREATE TABLE `event_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `image_path` VARCHAR(255) NOT NULL,
  `caption` VARCHAR(255),
  `display_order` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events
CREATE TABLE `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME,
  `location` VARCHAR(255),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- External Temple Databases
CREATE TABLE `external_temple_databases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `connection_string` TEXT NOT NULL,
  `db_type` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `last_sync` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hall Approval Logs
CREATE TABLE `hall_approval_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `action` ENUM('approved', 'rejected', 'cancelled') NOT NULL,
  `action_by` INT NOT NULL,
  `reason` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `marriage_hall_bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kanikalar (Hymns)
CREATE TABLE `kanikalar` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `audio_file` VARCHAR(255),
  `lyrics` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Knex Migrations (Framework Specific)
CREATE TABLE `knex_migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `batch` INT NOT NULL,
  `migration_time` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `knex_migrations_lock` (
  `index` INT AUTO_INCREMENT PRIMARY KEY,
  `is_locked` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ledger Categories
CREATE TABLE `ledger_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marriage Hall Bookings
CREATE TABLE `marriage_hall_bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL DEFAULT 1,
  `register_no` VARCHAR(100),
  `booking_date` DATE NOT NULL,
  `event_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `event_type` VARCHAR(100),
  `booked_by_name` VARCHAR(255) NOT NULL,
  `booked_by_phone` VARCHAR(20) NOT NULL,
  `booked_by_email` VARCHAR(255),
  `address` TEXT,
  `no_of_people` INT,
  `amount` DECIMAL(10,2) DEFAULT 0.00,
  `advance_amount` DECIMAL(10,2) DEFAULT 0.00,
  `balance_amount` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  `cancellation_reason` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marriage Registers
CREATE TABLE `marriage_registers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL DEFAULT 1,
  `register_no` VARCHAR(100) NOT NULL,
  `marriage_date` DATE NOT NULL,
  `groom_name` VARCHAR(255) NOT NULL,
  `groom_father_name` VARCHAR(255),
  `groom_address` TEXT,
  `bride_name` VARCHAR(255) NOT NULL,
  `bride_father_name` VARCHAR(255),
  `bride_address` TEXT,
  `witness1_name` VARCHAR(255),
  `witness1_address` TEXT,
  `witness2_name` VARCHAR(255),
  `witness2_address` TEXT,
  `priest_name` VARCHAR(255),
  `donation_amount` DECIMAL(10,2) DEFAULT 0.00,
  `receipt_no` VARCHAR(100),
  `remarks` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PDF Settings
CREATE TABLE `pdf_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `template_name` VARCHAR(100) NOT NULL,
  `header_html` TEXT,
  `footer_html` TEXT,
  `logo_path` VARCHAR(255),
  `font_family` VARCHAR(100) DEFAULT 'Arial',
  `font_size` INT DEFAULT 10,
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions
CREATE TABLE `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `module` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `permissions_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pooja Approval Logs
CREATE TABLE `pooja_approval_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pooja_id` INT NOT NULL,
  `action` ENUM('approved', 'rejected') NOT NULL,
  `action_by` INT NOT NULL,
  `reason` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`pooja_id`) REFERENCES `pooja`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profit and Loss
CREATE TABLE `profit_and_loss` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `financial_year` VARCHAR(20) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `income` DECIMAL(15,2) DEFAULT 0.00,
  `expense` DECIMAL(15,2) DEFAULT 0.00,
  `net_profit` DECIMAL(15,2) DEFAULT 0.00,
  `notes` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Properties
CREATE TABLE `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `location` TEXT,
  `purchase_date` DATE,
  `purchase_value` DECIMAL(15,2),
  `current_value` DECIMAL(15,2),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Receipts
CREATE TABLE `receipts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `receipt_no` VARCHAR(100) NOT NULL,
  `receipt_date` DATE NOT NULL,
  `receipt_type` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_mode` VARCHAR(50) NOT NULL,
  `reference_no` VARCHAR(100),
  `payer_name` VARCHAR(255) NOT NULL,
  `payer_address` TEXT,
  `payer_phone` VARCHAR(20),
  `purpose` TEXT,
  `notes` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session Logs
CREATE TABLE `session_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT,
  `login_time` DATETIME NOT NULL,
  `logout_time` DATETIME,
  `session_duration` INT,
  `status` ENUM('active', 'expired', 'logged_out') DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Superadmin Logs
CREATE TABLE `superadmin_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT,
  `details` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax Payments
CREATE TABLE `tax_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `tax_registration_id` INT NOT NULL,
  `payment_date` DATE NOT NULL,
  `financial_year` VARCHAR(20) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_mode` VARCHAR(50) NOT NULL,
  `reference_no` VARCHAR(100),
  `receipt_no` VARCHAR(100),
  `notes` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tax_registration_id`) REFERENCES `user_tax_registrations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax Settings
CREATE TABLE `tax_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `tax_name` VARCHAR(100) NOT NULL,
  `tax_percentage` DECIMAL(5,2) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Heirs
CREATE TABLE `user_heirs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `relationship` VARCHAR(100) NOT NULL,
  `dob` DATE,
  `gender` ENUM('male', 'female', 'other'),
  `address` TEXT,
  `phone` VARCHAR(20),
  `email` VARCHAR(255),
  `is_primary` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Registrations
CREATE TABLE `user_registrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `user_id` INT,
  `registration_no` VARCHAR(100) NOT NULL,
  `registration_date` DATE NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `gender` ENUM('male', 'female', 'other'),
  `dob` DATE,
  `father_name` VARCHAR(255),
  `mother_name` VARCHAR(255),
  `spouse_name` VARCHAR(255),
  `permanent_address` TEXT,
  `current_address` TEXT,
  `phone` VARCHAR(20),
  `alternate_phone` VARCHAR(20),
  `email` VARCHAR(255),
  `occupation` VARCHAR(100),
  `education` VARCHAR(100),
  `blood_group` VARCHAR(10),
  `photo_path` VARCHAR(255),
  `id_proof_type` VARCHAR(50),
  `id_proof_number` VARCHAR(100),
  `id_proof_path` VARCHAR(255),
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `rejection_reason` TEXT,
  `approved_by` INT,
  `approved_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Settings
CREATE TABLE `user_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `user_settings_user_id_setting_key_unique` (`user_id`, `setting_key`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Tax Registrations
CREATE TABLE `user_tax_registrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `temple_id` INT NOT NULL,
  `registration_no` VARCHAR(100) NOT NULL,
  `registration_date` DATE NOT NULL,
  `tax_type` VARCHAR(100) NOT NULL,
  `financial_year` VARCHAR(20) NOT NULL,
  `assessed_value` DECIMAL(15,2) NOT NULL,
  `tax_amount` DECIMAL(15,2) NOT NULL,
  `due_date` DATE,
  `status` ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  `notes` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wedding Events
CREATE TABLE `wedding_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `event_name` VARCHAR(255) NOT NULL,
  `groom_name` VARCHAR(255) NOT NULL,
  `bride_name` VARCHAR(255) NOT NULL,
  `event_date` DATE NOT NULL,
  `event_time` TIME,
  `location` VARCHAR(255),
  `contact_person` VARCHAR(255),
  `contact_phone` VARCHAR(20),
  `no_of_guests` INT,
  `special_requirements` TEXT,
  `status` ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  `created_by` INT,
  `updated_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for better performance
CREATE INDEX `idx_temples_name` ON `temples` (`name`);
CREATE INDEX `idx_users_username` ON `users` (`username`);
CREATE INDEX `idx_users_email` ON `users` (`email`);
CREATE INDEX `idx_donations_receipt_no` ON `donations` (`receipt_no`);
CREATE INDEX `idx_donations_donor_name` ON `donations` (`donor_name`);
CREATE INDEX `idx_donations_donation_date` ON `donations` (`donation_date`);
CREATE INDEX `idx_ledger_entries_date` ON `ledger_entries` (`date`);
CREATE INDEX `idx_ledger_entries_voucher_no` ON `ledger_entries` (`voucher_no`);
CREATE INDEX `idx_journal_entries_ledger_account_id` ON `journal_entries` (`ledger_account_id`);

-- Insert default temple if not exists
INSERT IGNORE INTO `temples` (`id`, `name`, `registration_id`, `address`, `phone`, `email`) 
VALUES (1, 'Default Temple', 'REG001', 'Temple Address', '1234567890', 'temple@example.com');

-- Insert default admin user if not exists (password: admin123)
INSERT IGNORE INTO `users` (`id`, `temple_id`, `username`, `password`, `name`, `email`, `role`, `is_active`) 
VALUES (1, 1, 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin@example.com', 'admin', 1);

-- Add default permissions for admin
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `access_level`) 
VALUES (1, '*', 'full');

-- Add default permissions
INSERT IGNORE INTO `permissions` (`name`, `description`, `module`) VALUES
('temples.manage', 'Manage Temples', 'System'),
('users.manage', 'Manage Users', 'System'),
('roles.manage', 'Manage Roles', 'System'),
('donations.manage', 'Manage Donations', 'Finance'),
('donations.approve', 'Approve Donations', 'Finance'),
('pooja.manage', 'Manage Pooja', 'Services'),
('pooja.approve', 'Approve Pooja', 'Services'),
('events.manage', 'Manage Events', 'Events'),
('hall_bookings.manage', 'Manage Hall Bookings', 'Facilities'),
('hall_bookings.approve', 'Approve Hall Bookings', 'Facilities'),
('reports.view', 'View Reports', 'Reports'),
('settings.manage', 'Manage Settings', 'System');

-- Add default role permissions for admin
INSERT IGNORE INTO `role_permissions` (`role`, `permission_id`, `access_level`) 
SELECT 'admin', name, 'full' FROM `permissions`;

-- Add default tax settings
INSERT IGNORE INTO `tax_settings` (`temple_id`, `tax_name`, `tax_percentage`, `is_active`) 
VALUES (1, 'GST', 18.00, 1);
