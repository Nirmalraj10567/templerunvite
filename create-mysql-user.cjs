const bcrypt = require('bcryptjs');
const knex = require('knex');

async function createMySQLUser() {
  // Connect to MySQL using the same config as the app
  const db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'rootroot',
      database: process.env.MYSQL_DATABASE || 'temple',
      timezone: 'Z',
    },
    pool: { min: 2, max: 10 },
  });

  try {
    console.log('🔌 Connecting to MySQL...');
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Connected to MySQL');
    
    // Check if temple exists
    let temple;
    try {
      temple = await db('temples').where({ id: 1 }).first();
    } catch (e) {
      console.log('⚠️ Could not query temples table:', e.message);
    }
    
    if (!temple) {
      console.log('⚠️ Temple ID 1 not found. Checking available temples...');
      try {
        const allTemples = await db('temples').select('id', 'name').limit(5);
        if (allTemples.length > 0) {
          console.log('Available temples:', allTemples.map(t => `ID:${t.id}=${t.name}`).join(', '));
        } else {
          console.log('⚠️ No temples found. You may need to create one manually.');
        }
      } catch (e) {
        console.log('⚠️ Could not list temples:', e.message);
      }
    } else {
      console.log('✅ Temple found:', temple.name);
    }
    
    // Check if test user exists
    const existing = await db('users').where({ username: 'testadmin' }).first();
    
    // Hash password
    const passwordHash = await bcrypt.hash('test123', 10);
    
    if (existing) {
      console.log('📝 Test user exists. Updating password...');
      await db('users').where({ id: existing.id }).update({
        password: passwordHash,
        updated_at: new Date()
      });
      console.log('✅ Password updated');
    } else {
      console.log('📝 Creating test user...');
      
      // Get columns to check which ones exist
      const columns = await db.raw('SHOW COLUMNS FROM users');
      const columnNames = columns[0].map(c => c.Field);
      console.log('Available columns:', columnNames.join(', '));
      
      // Build insert object based on available columns
      const userData = {
        username: 'testadmin',
        email: 'testadmin@temple.com',
        password: passwordHash,
        role: 'admin',
        temple_id: 1,
        status: 'active',
      };
      
      if (columnNames.includes('full_name')) {
        userData.full_name = 'Test Admin User';
      }
      if (columnNames.includes('created_at')) {
        userData.created_at = new Date();
      }
      if (columnNames.includes('updated_at')) {
        userData.updated_at = new Date();
      }
      
      await db('users').insert(userData);
      console.log('✅ Test user created');
    }
    
    // Verify user
    const user = await db('users').where({ username: 'testadmin' }).first();
    const verifyMatch = await bcrypt.compare('test123', user.password);
    
    console.log('\n' + '='.repeat(50));
    console.log('🔐 LOGIN CREDENTIALS');
    console.log('='.repeat(50));
    console.log('Username: testadmin');
    console.log('Password: test123');
    console.log('Email: testadmin@temple.com');
    console.log('Role: admin');
    console.log('Temple ID: 1');
    console.log('Password verify:', verifyMatch ? '✅ OK' : '❌ FAILED');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️ MySQL connection refused. Is MySQL running?');
      console.log('Check: mysql -h 127.0.0.1 -u root -p');
    }
  } finally {
    await db.destroy();
  }
}

createMySQLUser();
