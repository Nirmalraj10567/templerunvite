-- MySQL Compatible Schema for Temple Management System
-- Converted from SQLite to MySQL syntax

CREATE TABLE `temples` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `name` VARCHAR(255) NOT NULL, 
    `registration_id` VARCHAR(255), 
    `address` TEXT, 
    `phone` TEXT, 
    `email` TEXT
);

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
);

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
);

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
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `user_permissions` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `user_id` INT, 
    `permission_id` VARCHAR(255) NOT NULL, 
    `access_level` VARCHAR(20) DEFAULT 'none', 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `user_permissions_user_id_permission_id_unique` (`user_id`, `permission_id`)
);

CREATE TABLE `master_groups` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
    `name` VARCHAR(255) NOT NULL, 
    `description` VARCHAR(255), 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `master_clans` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
    `name` VARCHAR(255) NOT NULL, 
    `description` VARCHAR(255), 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `master_occupations` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
    `name` VARCHAR(255) NOT NULL, 
    `description` VARCHAR(255), 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `master_villages` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
    `name` VARCHAR(255) NOT NULL, 
    `description` VARCHAR(255), 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `master_educations` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
    `name` VARCHAR(255) NOT NULL, 
    `description` VARCHAR(255), 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `activity_logs` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT NOT NULL, 
    `actor_user_id` INT NOT NULL, 
    `action` VARCHAR(255) NOT NULL, 
    `target_table` VARCHAR(255), 
    `target_id` INT, 
    `details` TEXT, 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `superadmin_logs` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `user_id` INT NOT NULL, 
    `action` VARCHAR(255) NOT NULL, 
    `ip_address` VARCHAR(255) NOT NULL, 
    `user_agent` VARCHAR(255), 
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `session_logs` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `user_id` INT NOT NULL, 
    `login_time` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `logout_time` DATETIME, 
    `ip_address` VARCHAR(255) NOT NULL, 
    `user_agent` VARCHAR(255), 
    `duration_seconds` INT
);

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
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `photo_path` TEXT
);

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
);

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
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `status` VARCHAR(20) DEFAULT 'approved', 
    `submitted_by_mobile` TEXT, 
    `approved_by` INT, 
    `approved_at` TIMESTAMP, 
    `rejection_reason` TEXT, 
    `admin_notes` TEXT, 
    `submitted_at` TIMESTAMP, 
    `transfer_to_account` TEXT, 
    `hall_id` INT, 
    `event_id` INT,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `user_tax_registrations` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
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
    `male_heirs` INT DEFAULT '0', 
    `female_heirs` INT DEFAULT '0', 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `amount_paid` DECIMAL(10,2) DEFAULT 0, 
    `outstanding_amount` DECIMAL(10,2) DEFAULT 0, 
    `is_approved` BOOLEAN DEFAULT 0, 
    `approved_by` INT, 
    `approved_at` TIMESTAMP, 
    `note` TEXT, 
    `year` INT, 
    `tax_amount` DECIMAL(10,2) DEFAULT 0, 
    `transfer_to_account` TEXT, 
    `donation_amount` DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
);

CREATE TABLE `tax_settings` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT NOT NULL, 
    `year` INT NOT NULL, 
    `tax_amount` FLOAT NOT NULL, 
    `description` VARCHAR(255), 
    `is_active` BOOLEAN DEFAULT '1', 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `include_previous_years` BOOLEAN DEFAULT '0',
    UNIQUE KEY `tax_settings_temple_id_year_unique` (`temple_id`, `year`)
);

CREATE TABLE `permissions` (
    `id` TEXT PRIMARY KEY,
    `name` TEXT NOT NULL,
    `description` TEXT
);

CREATE TABLE `role_permissions` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `role_id` TEXT NOT NULL,
    `permission_id` TEXT NOT NULL,
    `access_level` TEXT NOT NULL,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
);

CREATE TABLE `properties` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` TEXT NOT NULL,
    `details` TEXT NOT NULL,
    `value` TEXT NOT NULL,
    `created_by` INT NOT NULL,
    `temple_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
);

CREATE TABLE `donations` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `temple_id` INT NOT NULL,
    `product_name` VARCHAR(255) DEFAULT 'General Donation',
    `description` TEXT,
    `price` DECIMAL(10,2) DEFAULT 0,
    `quantity` INT DEFAULT 1,
    `category` VARCHAR(100) DEFAULT 'General',
    `donor_name` VARCHAR(255) DEFAULT 'Anonymous',
    `donor_contact` TEXT,
    `donation_date` DATE DEFAULT (CURRENT_DATE),
    `status` VARCHAR(20) DEFAULT 'available',
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `approval_status` VARCHAR(20) DEFAULT 'approved',
    `submitted_by_mobile` TEXT,
    `submitted_at` TIMESTAMP,
    `approved_by` INT,
    `approved_at` TIMESTAMP,
    `rejection_reason` TEXT,
    `admin_notes` TEXT,
    `transfer_to_account` TEXT,
    `register_no` TEXT,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

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
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
);

CREATE TABLE `knex_migrations` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `name` VARCHAR(255), 
    `batch` INT, 
    `migration_time` DATETIME
);

CREATE TABLE `knex_migrations_lock` (
    `index` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `is_locked` INT
);

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
    `created_by` INT, 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `status` VARCHAR(20) DEFAULT 'approved', 
    `submitted_by_mobile` TEXT, 
    `submitted_at` TIMESTAMP, 
    `approved_at` TIMESTAMP, 
    `rejection_reason` TEXT, 
    `admin_notes` TEXT, 
    `approved_by` INT,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
);

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
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `status` VARCHAR(20) DEFAULT 'approved', 
    `submitted_by_mobile` TEXT, 
    `approved_by` INT, 
    `approved_at` TIMESTAMP, 
    `rejection_reason` TEXT, 
    `admin_notes` TEXT, 
    `submitted_at` TIMESTAMP, 
    `transfer_to_account` TEXT, 
    `amount` DECIMAL(10,2),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `pooja_approval_logs` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `pooja_id` INT NOT NULL, 
    `action` VARCHAR(255) NOT NULL, 
    `performed_by` INT, 
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `notes` TEXT, 
    `old_status` VARCHAR(255), 
    `new_status` VARCHAR(255),
    FOREIGN KEY (`pooja_id`) REFERENCES `pooja`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `tax_payments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `year` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paid_amount` DECIMAL(10, 2) DEFAULT 0,
    `status` VARCHAR(20) DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `user_registrations`(`id`)
);

CREATE TABLE `pooja_payments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT,
    `year` INT,
    `total_amount` DECIMAL(10,2) DEFAULT 0,
    `paid_amount` DECIMAL(10,2) DEFAULT 0,
    `status` VARCHAR(20) DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `ledger_accounts` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
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
    `type` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `kanikalar` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `bride_name` TEXT NOT NULL,
    `groom_name` TEXT NOT NULL,
    `wedding_date` TEXT NOT NULL,
    `venue` TEXT NOT NULL,
    `contact_number` TEXT,
    `email` TEXT,
    `temple_id` INT NOT NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `wedding_events` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `kanikalar_id` INT NOT NULL,
    `event_name` TEXT NOT NULL,
    `event_date` TEXT NOT NULL,
    `event_time` TEXT NOT NULL,
    `location` TEXT NOT NULL,
    `description` TEXT,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`kanikalar_id`) REFERENCES `kanikalar`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `ledger_entries` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `date` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `under` TEXT,
    `type` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `address` TEXT,
    `city` TEXT,
    `phone` TEXT,
    `mobile` TEXT,
    `email` TEXT,
    `note` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `registration_id` INT
);

CREATE TABLE `hall_approval_logs` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `booking_id` INT NOT NULL, 
    `action` VARCHAR(255) NOT NULL, 
    `performed_by` INT, 
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `notes` TEXT, 
    `old_status` VARCHAR(255), 
    `new_status` VARCHAR(255),
    FOREIGN KEY (`booking_id`) REFERENCES `marriage_hall_bookings`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `events` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `title` TEXT NOT NULL,
    `description` TEXT,
    `date` TEXT NOT NULL,
    `time` TEXT NOT NULL,
    `location` TEXT NOT NULL,
    `temple_id` INT NOT NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `event_images` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `event_id` INT NOT NULL,
    `image_path` TEXT NOT NULL,
    `uploaded_by` INT NOT NULL,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `annadhanam_approval_logs` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `annadhanam_id` INT NOT NULL, 
    `action` VARCHAR(255) NOT NULL, 
    `performed_by` INT, 
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `notes` TEXT, 
    `old_status` VARCHAR(255), 
    `new_status` VARCHAR(255),
    FOREIGN KEY (`annadhanam_id`) REFERENCES `annadhanam`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `donations_approval_logs` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `donation_id` INT NOT NULL, 
    `action` VARCHAR(255) NOT NULL, 
    `performed_by` INT, 
    `performed_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `notes` TEXT, 
    `old_status` VARCHAR(255), 
    `new_status` VARCHAR(255),
    FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

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
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`registration_id`) REFERENCES `user_registrations`(`id`) ON DELETE CASCADE
);

CREATE TABLE `ledger_categories` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `value` VARCHAR(255) NOT NULL, 
    `label` VARCHAR(255) NOT NULL, 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME,
    UNIQUE KEY `ledger_categories_value_unique` (`value`),
    UNIQUE KEY `ledger_categories_label_unique` (`label`)
);

CREATE TABLE `donation_products` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `value` VARCHAR(255) NOT NULL, 
    `label` VARCHAR(255) NOT NULL, 
    `unit` VARCHAR(255), 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME,
    UNIQUE KEY `donation_products_value_unique` (`value`),
    UNIQUE KEY `donation_products_label_unique` (`label`)
);

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
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `transfer_to_account` TEXT
);

CREATE TABLE `pdf_settings` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT NOT NULL, 
    `title_main` VARCHAR(255), 
    `title_sub` VARCHAR(255), 
    `title_line2` VARCHAR(512), 
    `subheader` VARCHAR(255), 
    `logo_url` VARCHAR(512), 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
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
);

CREATE TABLE `journal_entries` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `date` TEXT NOT NULL,
    `from_account` TEXT NOT NULL,
    `to_account` TEXT NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `entry_type` TEXT NOT NULL,
    `reference_type` TEXT,
    `reference_id` INT,
    `remarks` TEXT,
    `temple_id` INT,
    `created_by` INT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `user_settings_user_id_unique` (`user_id`)
);

CREATE TABLE `external_temple_databases` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `name` VARCHAR(255) NOT NULL, 
    `db_path` VARCHAR(255) NOT NULL, 
    `status` VARCHAR(255) NOT NULL DEFAULT 'active', 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `system_settings` (
    `key` VARCHAR(255) PRIMARY KEY, 
    `value` TEXT, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `master_halls` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
    `name` VARCHAR(255) NOT NULL, 
    `base_price` FLOAT NULL, 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `master_hall_events` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `temple_id` INT DEFAULT '1', 
    `name` VARCHAR(255) NOT NULL, 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, 
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create the profit_and_loss view (51st table/view from SQLite)
CREATE VIEW `profit_and_loss` AS
SELECT 
    DATE_FORMAT(date, '%Y-%m') as month,
    SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_expenses,
    (SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) - 
     SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END)) as net_profit_loss
FROM 
    ledger_entries
GROUP BY 
    DATE_FORMAT(date, '%Y-%m')
ORDER BY 
    month DESC;
