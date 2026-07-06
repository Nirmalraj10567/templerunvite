-- Multi-Company / Multi-Tenant User Authentication
-- 
-- Prerequisites:
--   1. Drop existing unique indexes on users table
--   2. Add composite unique constraints for tenant-scoped uniqueness
--   3. Add logo support to temples table
--
-- Run: mysql -u root -p templerun < server/migrations/20260706_multi_company_users.sql

-- Step 1: Drop existing global unique constraints
-- (Constraint names may vary; we drop by index name)
ALTER TABLE `users` DROP INDEX IF EXISTS `users_username_unique`;
ALTER TABLE `users` DROP INDEX IF EXISTS `users_mobile_unique`;
ALTER TABLE `users` DROP INDEX IF EXISTS `users_email_unique`;

-- Step 2: Add composite unique constraints for tenant-scoped uniqueness
-- UNIQUE(temple_id, username) - username unique within a company
-- UNIQUE(temple_id, mobile) - mobile unique within a company
ALTER TABLE `users` ADD UNIQUE INDEX `uq_users_temple_username` (`temple_id`, `username`);
ALTER TABLE `users` ADD UNIQUE INDEX `uq_users_temple_mobile` (`temple_id`, `mobile`);

-- Step 3: Add logo column to temples table (for company logo in selection UI)
ALTER TABLE `temples` ADD COLUMN IF NOT EXISTS `logo` VARCHAR(500) NULL AFTER `email`;
ALTER TABLE `temples` ADD COLUMN IF NOT EXISTS `branch` VARCHAR(255) NULL AFTER `logo`;
ALTER TABLE `temples` ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `branch`;
