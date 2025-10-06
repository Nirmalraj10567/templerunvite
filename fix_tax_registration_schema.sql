-- Fix the user_tax_registrations table to allow NULL values for reference_number
-- or provide a default value

-- Option 1: Allow NULL values for reference_number
ALTER TABLE `user_tax_registrations` MODIFY COLUMN `reference_number` VARCHAR(255) NULL;

-- Option 2: Add a default value for reference_number (uncomment if needed)
-- ALTER TABLE `user_tax_registrations` MODIFY COLUMN `reference_number` VARCHAR(255) DEFAULT '';

-- Check if member_id column exists, if not add it
-- This might be needed for linking to user_registrations table
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'templefinals' 
AND table_name = 'user_tax_registrations' 
AND column_name = 'member_id';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `user_tax_registrations` ADD COLUMN `member_id` INT NULL AFTER `temple_id`', 
    'SELECT "member_id column already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for member_id if it doesn't exist
-- (This links tax registrations to user registrations)
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.key_column_usage 
WHERE table_schema = 'templefinals' 
AND table_name = 'user_tax_registrations' 
AND column_name = 'member_id' 
AND referenced_table_name = 'user_registrations';

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE `user_tax_registrations` ADD CONSTRAINT `fk_tax_registrations_member_id` FOREIGN KEY (`member_id`) REFERENCES `user_registrations`(`id`) ON DELETE SET NULL', 
    'SELECT "member_id foreign key already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
