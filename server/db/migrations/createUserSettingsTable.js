/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create user_settings table if it doesn't exist
  const has = await knex.schema.hasTable('user_settings').catch(() => false);
  if (!has) {
    await knex.schema.createTable('user_settings', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable().unique();
      t.string('landing_route', 255).defaultTo('/dashboard');
      t.boolean('sidebar_collapsed_default').notNullable().defaultTo(false);
      t.text('hidden_menu_keys'); // JSON string array
      t.text('quick_actions'); // JSON string array of action keys
      t.text('shortcuts'); // JSON string map of route->keystroke
      t.string('language', 32); // optional persisted language
      t.string('theme', 32); // optional theme
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // Ensure columns exist for older DBs (idempotent guards)
  const ensureColumn = async (name, cb) => {
    const hasCol = await knex.schema.hasColumn('user_settings', name).catch(() => false);
    if (!hasCol) {
      try { await knex.schema.table('user_settings', cb); } catch (e) {
        console.log(`Note: Could not add column ${name} to user_settings:`, e.message);
      }
    }
  };

  await ensureColumn('landing_route', (t) => t.string('landing_route', 255).defaultTo('/dashboard'));
  await ensureColumn('sidebar_collapsed_default', (t) => t.boolean('sidebar_collapsed_default').notNullable().defaultTo(false));
  await ensureColumn('hidden_menu_keys', (t) => t.text('hidden_menu_keys'));
  await ensureColumn('quick_actions', (t) => t.text('quick_actions'));
  await ensureColumn('shortcuts', (t) => t.text('shortcuts'));
  await ensureColumn('language', (t) => t.string('language', 32));
  await ensureColumn('theme', (t) => t.string('theme', 32));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_settings');
};
