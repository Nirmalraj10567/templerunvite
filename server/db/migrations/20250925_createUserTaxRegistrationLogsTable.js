/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  const has = await knex.schema.hasTable('user_tax_registration_logs');
  if (!has) {
    await knex.schema.createTable('user_tax_registration_logs', (t) => {
      t.increments('id').primary();
      t.integer('temple_id').notNullable().index();
      t.integer('tax_registration_id').notNullable().index();
      t.string('action').notNullable(); // create | update | delete
      t.text('details'); // JSON string with payload/diff
      t.integer('created_by').nullable().index(); // users.id
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Add helpful indexes if they don't exist (best-effort for SQLite)
  try { await knex.raw('CREATE INDEX IF NOT EXISTS idx_utrl_temple ON user_tax_registration_logs(temple_id)'); } catch {}
  try { await knex.raw('CREATE INDEX IF NOT EXISTS idx_utrl_reg ON user_tax_registration_logs(tax_registration_id)'); } catch {}
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_tax_registration_logs');
};
