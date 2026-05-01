const db = require('./db');

async function migrate() {
  try {
    const columns = await db('pooja').columnInfo();
    
    if (!columns.entry_date) {
      await db.schema.alterTable('pooja', table => {
        table.date('entry_date');
      });
      console.log('Added entry_date column');
      // Populate entry_date with created_at date initially
      await db.raw('UPDATE pooja SET entry_date = DATE(created_at)');
      console.log('Populated entry_date with created_at values');
    }

    if (!columns.booking_date) {
      await db.schema.alterTable('pooja', table => {
        table.date('booking_date');
      });
      console.log('Added booking_date column');
      // Populate booking_date with from_date values initially
      if (columns.from_date) {
        await db.raw('UPDATE pooja SET booking_date = from_date');
        console.log('Populated booking_date with from_date values');
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();
