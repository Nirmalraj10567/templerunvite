const knex = require('knex');

async function addFamilyColumns() {
  const db = knex({
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'rootroot',
      database: 'temple',
    }
  });

  try {
    console.log('🔧 Adding family chain columns to MySQL...\n');
    
    const columns = [
      { name: 'parent_reference_id', type: 'VARCHAR(255)' },
      { name: 'gender', type: 'VARCHAR(20)' },
      { name: 'marital_status', type: 'VARCHAR(20)' },
      { name: 'wife_father_name', type: 'VARCHAR(255)' },
      { name: 'family_head_reference', type: 'VARCHAR(255)' },
      { name: 'relationship_type', type: 'VARCHAR(20)', default: 'self' },
    ];
    
    for (const col of columns) {
      try {
        // Check if column exists
        const existing = await db.raw(`SHOW COLUMNS FROM user_tax_registrations LIKE '${col.name}'`);
        if (existing[0].length === 0) {
          // Add column
          let sql = `ALTER TABLE user_tax_registrations ADD COLUMN ${col.name} ${col.type}`;
          if (col.default) {
            sql += ` DEFAULT '${col.default}'`;
          }
          sql += ' NULL';
          await db.raw(sql);
          console.log(`✅ Added column: ${col.name}`);
        } else {
          console.log(`ℹ️ Column exists: ${col.name}`);
        }
      } catch (e) {
        console.log(`⚠️ Error with ${col.name}:`, e.message);
      }
    }
    
    // Also add to user_registrations table
    console.log('\n🔧 Adding columns to user_registrations...');
    const userColumns = [
      { name: 'gender', type: 'VARCHAR(20)' },
      { name: 'marital_status', type: 'VARCHAR(20)' },
    ];
    
    for (const col of userColumns) {
      try {
        const existing = await db.raw(`SHOW COLUMNS FROM user_registrations LIKE '${col.name}'`);
        if (existing[0].length === 0) {
          await db.raw(`ALTER TABLE user_registrations ADD COLUMN ${col.name} ${col.type} NULL`);
          console.log(`✅ Added column: ${col.name}`);
        } else {
          console.log(`ℹ️ Column exists: ${col.name}`);
        }
      } catch (e) {
        console.log(`⚠️ Error with ${col.name}:`, e.message);
      }
    }
    
    console.log('\n✅ MySQL columns added!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

addFamilyColumns();
