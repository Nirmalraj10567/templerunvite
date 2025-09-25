/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  const has = await knex.schema.hasTable('money_donation_logs');
  if (!has) {
    await knex.schema.createTable('money_donation_logs', (t) => {
      t.increments('id').primary();
      t.integer('temple_id').notNullable().index();
      t.integer('donation_id').notNullable().index();
      t.string('action').notNullable(); // create | update | delete
      t.text('details'); // JSON string with full snapshot/diff
      t.integer('created_by').nullable().index();
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  try { await knex.raw('CREATE INDEX IF NOT EXISTS idx_mdl_temple ON money_donation_logs(temple_id)'); } catch {}
  try { await knex.raw('CREATE INDEX IF NOT EXISTS idx_mdl_donation ON money_donation_logs(donation_id)'); } catch {}
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('money_donation_logs');
};
