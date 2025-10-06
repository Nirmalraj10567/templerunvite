-- Fix the journal_entries table to handle reference_number field
-- The error suggests that journal_entries has a reference_number field without a default value

-- Check if reference_number column exists in journal_entries
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'templefinals' 
AND table_name = 'journal_entries' 
AND column_name = 'reference_number';

-- If the column exists, make it nullable or add a default value
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE `journal_entries` MODIFY COLUMN `reference_number` VARCHAR(255) NULL', 
    'SELECT "reference_number column does not exist in journal_entries" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Alternative: Add a default value instead of making it nullable
-- SET @sql = IF(@col_exists > 0, 
--     'ALTER TABLE `journal_entries` MODIFY COLUMN `reference_number` VARCHAR(255) DEFAULT ""', 
--     'SELECT "reference_number column does not exist in journal_entries" as message');
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- Show the current structure of journal_entries table
DESCRIBE `journal_entries`;
