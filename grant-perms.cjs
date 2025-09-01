const knex = require('knex');
const path = require('path');

const ALL_PERMISSION_IDS = [
  'user_registrations',
  'tax_registrations',
  'member_entry',
  'member_view',
  'ledger_management',
  'master_data',
  'activity_logs',
  'session_logs',
  'user_management',
  'marriage_register'
];

async function main() {
  const mobile = process.argv[2];
  const level = process.argv[3] || 'full';
  if (!mobile) {
    console.error('Usage: node grant-perms.cjs <mobile> [access_level]');
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

    for (const pid of ALL_PERMISSION_IDS) {
      const existing = await db('user_permissions')
        .where({ user_id: user.id, permission_id: pid })
        .first();
      if (existing) {
        await db('user_permissions')
          .where({ user_id: user.id, permission_id: pid })
          .update({ access_level: level, updated_at: db.fn.now() });
      } else {
        await db('user_permissions').insert({
          user_id: user.id,
          permission_id: pid,
          access_level: level,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    const after = await db('user_permissions')
      .where({ user_id: user.id })
      .select('permission_id', 'access_level');
    console.log(`Granted ${level} permissions to user ${user.id} (${mobile})`);
    console.table(after);
  } catch (err) {
    console.error('Error granting permissions:', err);
    process.exit(3);
  } finally {
    await db.destroy();
  }
}

main();
