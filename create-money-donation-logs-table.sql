-- Create money_donation_logs table for tracking money donation changes
CREATE TABLE IF NOT EXISTS `money_donation_logs` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `temple_id` INTEGER NOT NULL,
    `donation_id` INTEGER NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_by` INTEGER,
    `details` TEXT,
    FOREIGN KEY (`donation_id`) REFERENCES `money_donations`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS `money_donation_logs_donation_id_index` ON `money_donation_logs` (`donation_id`);
CREATE INDEX IF NOT EXISTS `money_donation_logs_temple_id_index` ON `money_donation_logs` (`temple_id`);
CREATE INDEX IF NOT EXISTS `money_donation_logs_action_index` ON `money_donation_logs` (`action`);
CREATE INDEX IF NOT EXISTS `money_donation_logs_created_at_index` ON `money_donation_logs` (`created_at`);