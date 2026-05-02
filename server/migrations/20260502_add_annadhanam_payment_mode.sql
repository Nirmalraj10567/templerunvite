-- Migration: Add payment_mode and account_id columns to annadhanam table
-- Date: 2026-05-02

-- Add payment_mode column if not exists
SET @exist := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'annadhanam'
    AND column_name = 'payment_mode'
);

SET @sql := IF(@exist = 0,
    'ALTER TABLE annadhanam ADD COLUMN payment_mode VARCHAR(20) NOT NULL DEFAULT "cash"',
    'SELECT "payment_mode column already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add account_id column if not exists
SET @exist2 := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'annadhanam'
    AND column_name = 'account_id'
);

SET @sql2 := IF(@exist2 = 0,
    'ALTER TABLE annadhanam ADD COLUMN account_id INT NULL',
    'SELECT "account_id column already exists"'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add index on account_id for better performance
SET @exist3 := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'annadhanam'
    AND index_name = 'idx_annadhanam_account_id'
);

SET @sql3 := IF(@exist3 = 0,
    'ALTER TABLE annadhanam ADD INDEX idx_annadhanam_account_id (account_id)',
    'SELECT "idx_annadhanam_account_id index already exists"'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Add foreign key constraint if not exists
SET @exist4 := (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
    AND table_name = 'annadhanam'
    AND constraint_name = 'fk_annadhanam_account'
);

SET @sql4 := IF(@exist4 = 0,
    'ALTER TABLE annadhanam ADD CONSTRAINT fk_annadhanam_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL',
    'SELECT "fk_annadhanam_account foreign key already exists"'
);
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

SELECT 'Annadhanam payment_mode migration completed successfully' as message;
