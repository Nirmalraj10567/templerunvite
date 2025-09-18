-- MySQL Schema for Temple Management System
-- Converted from SQLite to MySQL syntax

CREATE TABLE `temples` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `registration_id` varchar(255),
  `address` TEXT,
  `phone` TEXT,
  `email` TEXT,
  PRIMARY KEY (`id`)
);

CREATE TABLE `master_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL,
  `date` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `under` varchar(255) NOT NULL,
  `opening_balance` varchar(255) DEFAULT '0',
  `balance_type` varchar(255) DEFAULT 'credit',
  `address_line1` varchar(255) DEFAULT '',
  `address_line2` varchar(255) DEFAULT '',
  `address_line3` varchar(255) DEFAULT '',
  `address_line4` varchar(255) DEFAULT '',
  `village` varchar(255) DEFAULT '',
  `telephone` varchar(255) DEFAULT '',
  `mobile` varchar(255) DEFAULT '',
  `email` varchar(255) DEFAULT '',
  `note` varchar(255) DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
);

CREATE TABLE `master_people` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` varchar(255),
  `dob` varchar(255),
  `address` varchar(255),
  `village` varchar(255),
  `mobile` varchar(255),
  `email` varchar(255),
  `note` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
);

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `full_name` varchar(255) NOT NULL,
  `mobile` varchar(255),
  `password` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `temple_id` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int,
  `permission_id` varchar(255) NOT NULL,
  `access_level` enum('full', 'view', 'none') DEFAULT 'none',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_permissions_user_id_permission_id_unique` (`user_id`, `permission_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `master_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `description` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `master_clans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `description` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `master_occupations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `description` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `master_villages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `description` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `master_educations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `description` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL,
  `actor_user_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `target_table` varchar(255),
  `target_id` int,
  `details` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `superadmin_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `ip_address` varchar(255) NOT NULL,
  `user_agent` varchar(255),
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `session_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `login_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `logout_time` datetime,
  `ip_address` varchar(255) NOT NULL,
  `user_agent` varchar(255),
  `duration_seconds` int,
  PRIMARY KEY (`id`)
);

CREATE TABLE `user_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `reference_number` varchar(255),
  `date` varchar(255),
  `subdivision` varchar(255),
  `name` varchar(255) NOT NULL,
  `username` varchar(255),
  `email` varchar(255),
  `alternative_name` varchar(255),
  `wife_name` varchar(255),
  `education` varchar(255),
  `occupation` varchar(255),
  `father_name` varchar(255),
  `address` varchar(255),
  `birth_date` varchar(255),
  `village` varchar(255),
  `mobile_number` varchar(255),
  `aadhaar_number` varchar(255),
  `pan_number` varchar(255),
  `clan` varchar(255),
  `group` varchar(255),
  `postal_code` varchar(255),
  `male_heirs` int DEFAULT 0,
  `female_heirs` int DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `photo_path` TEXT,
  PRIMARY KEY (`id`)
);CREATE
 TABLE `marriage_registers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL DEFAULT 1,
  `register_no` varchar(255),
  `date` varchar(255),
  `time` varchar(255),
  `event` varchar(255),
  `groom_name` varchar(255),
  `bride_name` varchar(255),
  `address` varchar(255),
  `village` varchar(255),
  `guardian_name` varchar(255),
  `witness_one` varchar(255),
  `witness_two` varchar(255),
  `remarks` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `amount` int DEFAULT 0,
  PRIMARY KEY (`id`)
);

CREATE TABLE `marriage_hall_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL DEFAULT 1,
  `register_no` varchar(255),
  `date` varchar(255),
  `time` varchar(255),
  `event` varchar(255),
  `subdivision` varchar(255),
  `name` varchar(255),
  `address` varchar(255),
  `village` varchar(255),
  `mobile` varchar(255),
  `advance_amount` varchar(255),
  `total_amount` varchar(255),
  `balance_amount` varchar(255),
  `remarks` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `approved_by` int,
  `approved_at` timestamp NULL,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `submitted_at` timestamp NULL,
  `transfer_to_account` TEXT,
  `hall_id` int,
  `event_id` int,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `user_tax_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `reference_number` varchar(255),
  `date` varchar(255),
  `subdivision` varchar(255),
  `name` varchar(255) NOT NULL,
  `alternative_name` varchar(255),
  `wife_name` varchar(255),
  `education` varchar(255),
  `occupation` varchar(255),
  `father_name` varchar(255),
  `address` varchar(255),
  `birth_date` varchar(255),
  `village` varchar(255),
  `mobile_number` varchar(255),
  `aadhaar_number` varchar(255),
  `pan_number` varchar(255),
  `clan` varchar(255),
  `group` varchar(255),
  `postal_code` varchar(255),
  `male_heirs` int DEFAULT 0,
  `female_heirs` int DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `amount_paid` decimal(10,2) DEFAULT 0,
  `outstanding_amount` decimal(10,2) DEFAULT 0,
  `is_approved` boolean DEFAULT 0,
  `approved_by` int,
  `approved_at` timestamp NULL,
  `note` TEXT,
  `year` int,
  `tax_amount` decimal(10,2) DEFAULT 0,
  `transfer_to_account` TEXT,
  `donation_amount` decimal(10,2) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
);

CREATE TABLE `tax_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL,
  `year` int NOT NULL,
  `tax_amount` float NOT NULL,
  `description` varchar(255),
  `is_active` boolean DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `include_previous_years` boolean DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_settings_temple_id_year_unique` (`temple_id`, `year`)
);

CREATE TABLE `permissions` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` TEXT,
  PRIMARY KEY (`id`)
);

CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` varchar(255) NOT NULL,
  `permission_id` varchar(255) NOT NULL,
  `access_level` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
);

CREATE TABLE `properties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `details` TEXT NOT NULL,
  `value` TEXT NOT NULL,
  `created_by` int NOT NULL,
  `temple_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_properties_temple_id` (`temple_id`),
  KEY `idx_properties_created_by` (`created_by`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
);

CREATE TABLE `donations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL,
  `product_name` varchar(255) DEFAULT 'General Donation',
  `description` TEXT,
  `price` decimal(10,2) DEFAULT 0,
  `quantity` int DEFAULT 1,
  `category` varchar(255) DEFAULT 'General',
  `donor_name` varchar(255) DEFAULT 'Anonymous',
  `donor_contact` varchar(255),
  `donation_date` date DEFAULT (CURRENT_DATE),
  `status` enum('available', 'reserved', 'distributed') DEFAULT 'available',
  `notes` TEXT,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approval_status` enum('pending','approved','rejected','cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `submitted_at` timestamp NULL,
  `approved_by` int,
  `approved_at` timestamp NULL,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `transfer_to_account` TEXT,
  `register_no` TEXT,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `register_no` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL COMMENT 'receipt or payment',
  `from_person` varchar(255),
  `to_person` varchar(255),
  `amount` decimal(10,2) NOT NULL,
  `remarks` TEXT,
  `created_by` int NOT NULL,
  `temple_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_receipts_temple_id` (`temple_id`),
  KEY `idx_receipts_date` (`date`),
  KEY `idx_receipts_register_no` (`register_no`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`)
);

CREATE TABLE `annadhanam` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL DEFAULT 1,
  `receipt_number` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `mobile_number` varchar(255) NOT NULL,
  `food` text NOT NULL,
  `peoples` int NOT NULL,
  `time` varchar(255) NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `remarks` text,
  `created_by` int,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `submitted_at` timestamp NULL,
  `approved_at` timestamp NULL,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `approved_by` int,
  PRIMARY KEY (`id`),
  KEY `annadhanam_temple_id_index` (`temple_id`),
  KEY `annadhanam_receipt_number_index` (`receipt_number`),
  KEY `annadhanam_name_index` (`name`),
  KEY `annadhanam_mobile_number_index` (`mobile_number`),
  KEY `annadhanam_from_date_index` (`from_date`),
  KEY `annadhanam_to_date_index` (`to_date`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE
);CREAT
E TABLE `pooja` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL DEFAULT 1,
  `receipt_number` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `mobile_number` varchar(255) NOT NULL,
  `time` varchar(255) NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `remarks` text,
  `created_by` int,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
  `submitted_by_mobile` TEXT,
  `approved_by` int,
  `approved_at` timestamp NULL,
  `rejection_reason` TEXT,
  `admin_notes` TEXT,
  `submitted_at` timestamp NULL,
  `transfer_to_account` TEXT,
  `amount` decimal(10,2),
  PRIMARY KEY (`id`),
  KEY `pooja_temple_id_index` (`temple_id`),
  KEY `pooja_receipt_number_index` (`receipt_number`),
  KEY `pooja_name_index` (`name`),
  KEY `pooja_mobile_number_index` (`mobile_number`),
  KEY `pooja_from_date_index` (`from_date`),
  KEY `pooja_to_date_index` (`to_date`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `pooja_approval_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pooja_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `performed_by` int,
  `performed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `old_status` varchar(255),
  `new_status` varchar(255),
  PRIMARY KEY (`id`),
  KEY `pooja_approval_logs_pooja_id_index` (`pooja_id`),
  KEY `pooja_approval_logs_action_index` (`action`),
  FOREIGN KEY (`pooja_id`) REFERENCES `pooja`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `tax_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `year` int NOT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `paid_amount` decimal(10, 2) DEFAULT 0,
  `status` enum('pending', 'partial', 'paid') DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `user_registrations`(`id`)
);

CREATE TABLE `pooja_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int,
  `year` int,
  `total_amount` decimal(10,2) DEFAULT 0,
  `paid_amount` decimal(10,2) DEFAULT 0,
  `status` varchar(255) DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `ledger_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `under` varchar(255),
  `current_balance` decimal(10, 2) DEFAULT 0,
  `address` TEXT,
  `city` varchar(255),
  `phone` varchar(255),
  `mobile` varchar(255),
  `email` varchar(255),
  `note` TEXT,
  `type` enum('credit', 'debit') NOT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ledger_accounts_date` (`date`),
  KEY `idx_ledger_accounts_name` (`name`),
  KEY `idx_ledger_accounts_under` (`under`)
);

CREATE TABLE `kanikalar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bride_name` varchar(255) NOT NULL,
  `groom_name` varchar(255) NOT NULL,
  `wedding_date` varchar(255) NOT NULL,
  `venue` varchar(255) NOT NULL,
  `contact_number` varchar(255),
  `email` varchar(255),
  `temple_id` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `wedding_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kanikalar_id` int NOT NULL,
  `event_name` varchar(255) NOT NULL,
  `event_date` varchar(255) NOT NULL,
  `event_time` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `description` TEXT,
  `created_by` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`kanikalar_id`) REFERENCES `kanikalar`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `ledger_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `under` varchar(255),
  `type` enum('credit', 'debit') NOT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `address` TEXT,
  `city` varchar(255),
  `phone` varchar(255),
  `mobile` varchar(255),
  `email` varchar(255),
  `note` TEXT,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `registration_id` int,
  PRIMARY KEY (`id`),
  KEY `idx_ledger_entries_date` (`date`),
  KEY `idx_ledger_entries_name` (`name`),
  KEY `idx_ledger_entries_under` (`under`)
);

CREATE TABLE `hall_approval_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `performed_by` int,
  `performed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `old_status` varchar(255),
  `new_status` varchar(255),
  PRIMARY KEY (`id`),
  KEY `hall_approval_logs_booking_id_index` (`booking_id`),
  KEY `hall_approval_logs_action_index` (`action`),
  FOREIGN KEY (`booking_id`) REFERENCES `marriage_hall_bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` TEXT,
  `date` varchar(255) NOT NULL,
  `time` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `temple_id` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`temple_id`) REFERENCES `temples`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `event_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `uploaded_by` int NOT NULL,
  `uploaded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `title` varchar(255),
  `caption` TEXT,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);CRE
ATE TABLE `annadhanam_approval_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `annadhanam_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `performed_by` int,
  `performed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `old_status` varchar(255),
  `new_status` varchar(255),
  PRIMARY KEY (`id`),
  KEY `annadhanam_approval_logs_annadhanam_id_index` (`annadhanam_id`),
  KEY `annadhanam_approval_logs_action_index` (`action`),
  FOREIGN KEY (`annadhanam_id`) REFERENCES `annadhanam`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `donations_approval_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `donation_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `performed_by` int,
  `performed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `old_status` varchar(255),
  `new_status` varchar(255),
  PRIMARY KEY (`id`),
  KEY `donations_approval_logs_donation_id_index` (`donation_id`),
  KEY `donations_approval_logs_action_index` (`action`),
  FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE `user_heirs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `registration_id` int NOT NULL,
  `serial_number` int NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `race` varchar(255),
  `marital_status` varchar(255),
  `education` varchar(255),
  `birth_date` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`registration_id`) REFERENCES `user_registrations`(`id`) ON DELETE CASCADE
);

CREATE TABLE `ledger_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `value` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ledger_categories_value_unique` (`value`),
  UNIQUE KEY `ledger_categories_label_unique` (`label`)
);

CREATE TABLE `donation_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `value` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `unit` varchar(255),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `donation_products_value_unique` (`value`),
  UNIQUE KEY `donation_products_label_unique` (`label`)
);

CREATE TABLE `money_donations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `register_no` varchar(255),
  `date` varchar(255) NOT NULL,
  `name` varchar(255),
  `father_name` varchar(255),
  `address` varchar(255),
  `village` varchar(255),
  `phone` varchar(255),
  `amount` float NOT NULL,
  `reason` varchar(255),
  `temple_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `transfer_to_account` TEXT,
  PRIMARY KEY (`id`)
);

CREATE TABLE `pdf_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int NOT NULL,
  `title_main` varchar(255),
  `title_sub` varchar(255),
  `title_line2` varchar(512),
  `subheader` varchar(255),
  `logo_url` varchar(512),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tax_subheader` varchar(255),
  `annadhanam_subheader` varchar(255),
  `hall_subheader` varchar(255),
  `watermark_text` varchar(255),
  `annadhanam_receipt_label` varchar(255),
  `annadhanam_date_label` varchar(255),
  `annadhanam_year_label` varchar(255),
  `annadhanam_cell_label` varchar(255),
  `annadhanam_collector_label` varchar(255),
  PRIMARY KEY (`id`),
  UNIQUE KEY `pdf_settings_temple_id_unique` (`temple_id`)
);

CREATE TABLE `journal_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` varchar(255) NOT NULL,
  `from_account` varchar(255) NOT NULL,
  `to_account` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL CHECK (`amount` > 0),
  `entry_type` enum('transfer','receipt','payment','donation','adjustment') NOT NULL,
  `reference_type` varchar(255),
  `reference_id` int,
  `remarks` TEXT,
  `temple_id` int,
  `created_by` int,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_date` (`date`),
  KEY `idx_journal_from` (`from_account`),
  KEY `idx_journal_to` (`to_account`),
  KEY `idx_journal_temple` (`temple_id`)
);

CREATE TABLE `user_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `landing_route` varchar(255) DEFAULT '/dashboard',
  `sidebar_collapsed_default` boolean NOT NULL DEFAULT 0,
  `hidden_menu_keys` text,
  `quick_actions` text,
  `language` varchar(32),
  `theme` varchar(32),
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_settings_user_id_unique` (`user_id`)
);

CREATE TABLE `external_temple_databases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `db_path` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `system_settings` (
  `key` varchar(255) NOT NULL,
  `value` text,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
);

CREATE TABLE `master_halls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `base_price` float NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `master_hall_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `temple_id` int DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `receipt_counter` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `last_number` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`year`)
);

-- Create the profit and loss view
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