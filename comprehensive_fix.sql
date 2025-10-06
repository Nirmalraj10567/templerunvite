-- Comprehensive fix for tax registration issues
-- This script addresses both the reference_number and member_id issues

-- 1. Fix user_tax_registrations table
-- Make reference_number nullable if it's not already
ALTER TABLE `user_tax_registrations` MODIFY COLUMN `reference_number` VARCHAR(255) NULL;

-- Add member_id column if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'templefinals' 
AND table_name = 'user_tax_registrations' 
AND column_name = 'member_id';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `user_tax_registrations` ADD COLUMN `member_id` INT NULL AFTER `temple_id`', 
    'SELECT "member_id column already exists in user_tax_registrations" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for member_id if it doesn't exist
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.key_column_usage 
WHERE table_schema = 'templefinals' 
AND table_name = 'user_tax_registrations' 
AND column_name = 'member_id' 
AND referenced_table_name = 'user_registrations';

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE `user_tax_registrations` ADD CONSTRAINT `fk_tax_registrations_member_id` FOREIGN KEY (`member_id`) REFERENCES `user_registrations`(`id`) ON DELETE SET NULL', 
    'SELECT "member_id foreign key already exists in user_tax_registrations" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Fix journal_entries table
-- Check if reference_number column exists in journal_entries
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'templefinals' 
AND table_name = 'journal_entries' 
AND column_name = 'reference_number';

-- If the column exists, make it nullable
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE `journal_entries` MODIFY COLUMN `reference_number` VARCHAR(255) NULL', 
    'SELECT "reference_number column does not exist in journal_entries" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Show current table structures
SELECT 'Current user_tax_registrations structure:' as info;
DESCRIBE `user_tax_registrations`;

SELECT 'Current journal_entries structure:' as info;
DESCRIBE `journal_entries`;
