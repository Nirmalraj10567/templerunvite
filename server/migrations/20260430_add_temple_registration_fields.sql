-- Add fields to temples table for registration form data
ALTER TABLE `temples` 
  ADD COLUMN `website_link` VARCHAR(255) NULL AFTER `email`,
  ADD COLUMN `is_trust` TINYINT(1) DEFAULT 0 AFTER `website_link`,
  ADD COLUMN `trust_type` VARCHAR(255) NULL AFTER `is_trust`,
  ADD COLUMN `trust_registration_number` VARCHAR(255) NULL AFTER `trust_type`,
  ADD COLUMN `date_of_registration` DATE NULL AFTER `trust_registration_number`,
  ADD COLUMN `pan_number` VARCHAR(20) NULL AFTER `date_of_registration`,
  ADD COLUMN `tan_number` VARCHAR(20) NULL AFTER `pan_number`,
  ADD COLUMN `gst_number` VARCHAR(20) NULL AFTER `tan_number`,
  ADD COLUMN `reg_12a` VARCHAR(255) NULL AFTER `gst_number`,
  ADD COLUMN `reg_80g` VARCHAR(255) NULL AFTER `reg_12a`;
