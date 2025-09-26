-- Start transaction
START TRANSACTION;

-- Create temporary table to store existing data
CREATE TEMPORARY TABLE temp_donation_products 
SELECT * FROM donation_products;

-- Update existing records to associate with temples
-- This assumes you want to associate existing products with temple ID 1
UPDATE donation_products
SET temple_id = 1
WHERE temple_id IS NULL;

-- Handle duplicate products across temples
CREATE TEMPORARY TABLE duplicates AS
SELECT label, COUNT(*) as count
FROM donation_products
GROUP BY label
HAVING COUNT(*) > 1;

-- Update duplicates with temple-specific suffix
UPDATE donation_products d
JOIN duplicates dup ON d.label = dup.label
JOIN (
    SELECT label, MIN(id) as first_id
    FROM donation_products
    GROUP BY label
) first ON d.label = first.label
SET d.label = CONCAT(d.label, ' (Temple ', d.temple_id, ')')
WHERE d.id != first.first_id;

-- Verify the migration
SELECT 
    d.label,
    d.value,
    d.unit,
    t.name as temple_name,
    d.created_at,
    d.updated_at
FROM donation_products d
JOIN temples t ON d.temple_id = t.id
ORDER BY t.id, d.label;

-- If everything looks good, commit the transaction
COMMIT;

-- Cleanup temporary tables
DROP TEMPORARY TABLE IF EXISTS temp_donation_products;
DROP TEMPORARY TABLE IF EXISTS duplicates;

-- If something goes wrong, you can rollback:
-- ROLLBACK;