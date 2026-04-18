/**
 * Migration to create master_food_items table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('master_food_items');
  
  if (!hasTable) {
    await knex.schema.createTable('master_food_items', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').unsigned().notNullable().defaultTo(1);
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('category', 100).defaultTo('general');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign key constraint
      table.foreign('temple_id').references('id').inTable('temples').onDelete('CASCADE');
      
      // Unique constraint per temple
      table.unique(['temple_id', 'name']);
      
      // Indexes for search
      table.index(['temple_id', 'name']);
      table.index('name');
    });
    
    console.log('✅ Created master_food_items table');
  } else {
    console.log('ℹ️ master_food_items table already exists');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('master_food_items');
  console.log('⬇️ Dropped master_food_items table');
};
