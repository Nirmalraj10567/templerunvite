const knex = require('knex');
const path = require('path');

async function main() {
  const mobile = process.argv[2];
  if (!mobile) {
    console.error('Usage: node get-user-perms.cjs <mobile>');
    process.exit(1);
  }

  const db = knex({
    client: 'sqlite3',
    connection: { filename: path.join(__dirname, 'server', 'deev.sqlite3') },
    useNullAsDefault: true,
  });

  try {
    const user = await db('users').where({ mobile }).first();
    if (!user) {
      console.error(`No user found with mobile ${mobile}.`);
      process.exit(2);
    }
    console.log('User:', { id: user.id, username: user.username, mobile: user.mobile, role: user.role, temple_id: user.temple_id });

    const perms = await db('user_permissions').where({ user_id: user.id }).select('permission_id', 'access_level');
    console.log('Permissions:');
    if (!perms.length) {
      console.log('(none)');
    } else {
      console.table(perms);
    }
  } catch (err) {
    console.error('Error reading permissions:', err);
    process.exit(3);
  } finally {
    await db.destroy();
  }
}

main();
