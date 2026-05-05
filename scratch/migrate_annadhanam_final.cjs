const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/env') });
const db = require('/var/www/templerunvite/server/db');

async function migrate() {
  try {
    console.log('Starting data migration for annadhanam table...');
    
    // 1. Classification
    console.log('Classifying donation types...');
    await db('annadhanam').where('food', 'like', 'Product:%').update({ donation_type: 'product' });
    await db('annadhanam').where('food', 'like', 'Money:%').update({ donation_type: 'money' });
    await db('annadhanam').whereNull('donation_type').orWhere('donation_type', '').update({ donation_type: 'food' });

    // 2. Row-by-row parsing for accuracy
    console.log('Parsing food strings into structured columns...');
    const records = await db('annadhanam').whereIn('donation_type', ['product', 'money']);
    
    let updatedCount = 0;
    for (const row of records) {
      const updates = {};
      const ft = row.food || '';
      
      if (row.donation_type === 'product') {
        // Extract Product Name
        const nameMatch = ft.match(/Product:\s*([^|]+)/i);
        if (nameMatch && (!row.product_name)) {
          updates.product_name = nameMatch[1].trim();
        }
        
        // Extract Quantity
        const qtyMatch = ft.match(/Qty:\s*([0-9.]+)/i);
        if (qtyMatch && (row.quantity === null)) {
          updates.quantity = parseFloat(qtyMatch[1]);
        }
        
        // Extract Unit
        const unitMatch = ft.match(/Unit:\s*([^|]+)/i);
        if (unitMatch && (!row.unit)) {
          updates.unit = unitMatch[1].trim();
        }
      } else if (row.donation_type === 'money') {
        // Extract Amount
        const amtMatch = ft.match(/Money:\s*([0-9.]+)/i);
        if (amtMatch && (row.amount === null)) {
          updates.amount = parseFloat(amtMatch[1]);
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await db('annadhanam').where({ id: row.id }).update(updates);
        updatedCount++;
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} records.`);
    
    // 3. Final verification
    const samples = await db('annadhanam').select('id', 'food', 'donation_type', 'product_name', 'quantity', 'unit', 'amount').limit(10);
    console.table(samples);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
