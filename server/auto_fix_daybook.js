
require('dotenv').config({ path: './server/.env' });
const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'YourStrongPassword123',
    database: process.env.MYSQL_DATABASE || 'templerun',
  },
});

async function fixDaybook() {
  console.log('🚀 Starting Daybook Fix Script (MySQL)...');
  
  try {
    // 1. Find all Annadhanam records that look like money donations
    const annadhanamRows = await db('annadhanam').where('food', 'like', 'Money:%');
    console.log(`Found ${annadhanamRows.length} Annadhanam money entries.`);

    for (const row of annadhanamRows) {
      // Parse amount from string like "Money: 1000"
      const amountStr = row.food.replace(/^Money:\s*/i, '').trim();
      const amountNum = parseFloat(amountStr);
      
      if (!isNaN(amountNum)) {
        console.log(`Updating Receipt ${row.receipt_number}: Setting amount to ₹${amountNum}`);
        
        // Update the Annadhanam record itself (ensure amount/type columns are set)
        await db('annadhanam')
          .where('id', row.id)
          .update({
            amount: amountNum,
            donation_type: 'money'
          });

        // Update the corresponding Daybook entry
        await db('daybook_entries')
          .where({
            reference_type: 'annadhanam',
            reference_id: row.id
          })
          .update({
            amount: amountNum,
            payment_mode: 'cash',
            entry_type: 'income'
          });
      }
    }

    console.log('✅ Fix complete! Please refresh your Daybook page.');
  } catch (err) {
    console.error('❌ Error during fix:', err);
  } finally {
    await db.destroy();
  }
}

fixDaybook();
