const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/env') });
const db = require('/var/www/templerunvite/server/db');

async function checkData() {
  try {
    const records = await db('annadhanam').select('id', 'food', 'donation_type', 'product_name', 'quantity').limit(10);
    console.log('Sample data from annadhanam:');
    console.table(records);
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    process.exit();
  }
}

checkData();
