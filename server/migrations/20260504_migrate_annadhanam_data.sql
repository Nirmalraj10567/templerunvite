-- MySQL Migration Script for Annadhanam Structured Data

-- 1. Ensure columns exist (MySQL 8.0.19+ syntax or just plain ALTER if we know the state)
-- If using older MySQL, we ignore errors if columns exist
ALTER TABLE annadhanam MODIFY COLUMN donation_type VARCHAR(50) DEFAULT 'food';
ALTER TABLE annadhanam MODIFY COLUMN product_name VARCHAR(255);
ALTER TABLE annadhanam MODIFY COLUMN quantity DECIMAL(10,2);
ALTER TABLE annadhanam MODIFY COLUMN amount DECIMAL(10,2);

-- Add unit if missing (plain ALTER, might fail if exists but that's okay in this context)
-- Since we already added it in the previous step, this is for completeness
ALTER TABLE annadhanam ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- 2. Initial Donation Type Classification
UPDATE annadhanam 
SET donation_type = 'product' 
WHERE food LIKE 'Product:%';

UPDATE annadhanam 
SET donation_type = 'money' 
WHERE food LIKE 'Money:%';

UPDATE annadhanam 
SET donation_type = 'food' 
WHERE donation_type IS NULL OR (food NOT LIKE 'Product:%' AND food NOT LIKE 'Money:%');

-- 3. Parse and Migrate Data from 'food' string to structured columns

-- Migrate Product Name: Extract string between 'Product:' and the first '|'
UPDATE annadhanam 
SET product_name = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(food, 'Product:', -1), '|', 1))
WHERE donation_type = 'product' AND (product_name IS NULL OR product_name = '');

-- Migrate Quantity: Extract string after 'Qty:' and before next '|'
-- Handle cases where Qty might not be present
UPDATE annadhanam 
SET quantity = CAST(REGEXP_REPLACE(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(food, 'Qty:', -1), '|', 1)), '[^0-9.]', '') AS DECIMAL(10,2))
WHERE donation_type = 'product' AND food LIKE '%Qty:%' AND quantity IS NULL;

-- Migrate Unit: Extract string after 'Unit:'
UPDATE annadhanam 
SET unit = TRIM(SUBSTRING_INDEX(food, 'Unit:', -1))
WHERE donation_type = 'product' AND food LIKE '%Unit:%' AND (unit IS NULL OR unit = '');

-- Migrate Amount: Extract number after 'Money:'
UPDATE annadhanam 
SET amount = CAST(REGEXP_REPLACE(TRIM(SUBSTRING_INDEX(food, 'Money:', -1)), '[^0-9.]', '') AS DECIMAL(10,2))
WHERE donation_type = 'money' AND amount IS NULL;

-- 4. Verify results
SELECT id, food, donation_type, product_name, quantity, unit, amount FROM annadhanam LIMIT 20;
