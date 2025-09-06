const knex = require('knex');
const path = require('path');

async function main() {
  const mobile = process.argv[2];
  const role = process.argv[3] || 'superadmin';
  if (!mobile) {
    console.error('Usage: node set-user-role.js <mobile> [role]');
    process.exit(1);
  }

  const db = knex({
    client: 'sqlite3',
    connection: { filename: path.join(__dirname, 'server', 'deev.sqlite3') },
    useNullAsDefault: true,
    pool: { afterCreate: (conn, done) => conn.run('PRAGMA foreign_keys = ON', done) }
  });

  try {
    const user = await db('users').where({ mobile }).first();
    if (!user) {
      console.error(`No user found with mobile ${mobile}.`);
      process.exit(2);
    }
    await db('users').where({ id: user.id }).update({ role, updated_at: db.fn.now() });
    const updated = await db('users').where({ id: user.id }).first();
    console.log('Updated user:', { id: updated.id, mobile: updated.mobile, role: updated.role });
  } catch (err) {
    console.error('Error updating role:', err);
    process.exit(3);
  } finally {
    await db.destroy();
  }
}

main();
