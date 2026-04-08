const db = require('./server/db');

async function findUsers() {
  try {
    console.log('--- System Users (Admins/Staff) ---');
    const systemUsers = await db('users').select('id', 'username', 'mobile', 'role').limit(5);
    console.table(systemUsers);

    console.log('\n--- Member Users (Registrations) ---');
    const members = await db('user_registrations').select('id', 'name', 'mobile_number', 'reference_number').limit(5);
    console.table(members);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

findUsers();
