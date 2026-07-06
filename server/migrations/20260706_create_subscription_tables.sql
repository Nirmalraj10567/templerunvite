CREATE TABLE IF NOT EXISTS `feature_definitions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `feature_key` VARCHAR(100) NOT NULL UNIQUE,
  `feature_type` ENUM('number','boolean','select') NOT NULL DEFAULT 'boolean',
  `feature_label` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(50) DEFAULT 'modules',
  `options` JSON,
  `default_value` TEXT,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `plans` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `badge` VARCHAR(50) DEFAULT NULL,
  `monthly_price` INT NOT NULL DEFAULT 0,
  `annual_price` INT NOT NULL DEFAULT 0,
  `features` JSON,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_free` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL,
  `plan_id` INT NOT NULL,
  `billing_cycle` ENUM('monthly','annual') NOT NULL DEFAULT 'monthly',
  `status` ENUM('active','pending','cancelled','expired') NOT NULL DEFAULT 'pending',
  `current_period_start` DATE DEFAULT NULL,
  `current_period_end` DATE DEFAULT NULL,
  `trial_ends_at` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_temple_subscription` (`temple_id`),
  KEY `idx_subscription_plan` (`plan_id`),
  KEY `idx_subscription_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `temple_id` INT NOT NULL,
  `subscription_id` INT DEFAULT NULL,
  `amount` INT NOT NULL,
  `billing_cycle` ENUM('monthly','annual') NOT NULL,
  `status` ENUM('paid','pending','refunded') NOT NULL DEFAULT 'paid',
  `paid_at` DATE DEFAULT NULL,
  `notes` TEXT,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_payment_temple` (`temple_id`),
  KEY `idx_payment_subscription` (`subscription_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
