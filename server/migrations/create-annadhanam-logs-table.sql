-- Create annadhanam_logs table for tracking all annadhanam operations
-- This table will log create, update, and delete operations on annadhanam entries

CREATE TABLE IF NOT EXISTS `annadhanam_logs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `annadhanam_id` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
  `details` TEXT, -- JSON string with full snapshot/diff
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_annadhanam_logs_temple_id` (`temple_id`),
  INDEX `idx_annadhanam_logs_annadhanam_id` (`annadhanam_id`),
  INDEX `idx_annadhanam_logs_action` (`action`),
  INDEX `idx_annadhanam_logs_created_at` (`created_at`),
  CONSTRAINT `annadhanam_logs_fk_annadhanam` FOREIGN KEY (`annadhanam_id`) REFERENCES `annadhanam`(`id`) ON DELETE CASCADE,
  CONSTRAINT `annadhanam_logs_fk_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
