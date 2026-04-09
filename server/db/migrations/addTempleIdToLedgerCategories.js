exports.up = async function(db) {
  try {
    // Check if temple_id column exists
    const columns = await db.raw("PRAGMA table_info(ledger_categories)");
    const hasTempleId = columns.some(col => col.name === 'temple_id');
    
    if (!hasTempleId) {
      // Add temple_id column with default value 1
      await db.raw('ALTER TABLE ledger_categories ADD COLUMN temple_id INTEGER NOT NULL DEFAULT 1');
      
      // Create indexes
      await db.raw('CREATE INDEX IF NOT EXISTS idx_ledger_categories_temple_id ON ledger_categories(temple_id)');
      
      // Update existing records to have temple_id = 1
      await db.raw('UPDATE ledger_categories SET temple_id = 1 WHERE temple_id IS NULL');
      
      console.log('Successfully added temple_id to ledger_categories table and updated existing records');
    }
    
    console.log('Ledger categories temple_id migration completed');
  } catch (error) {
    console.log('Note: temple_id column may already exist or migration failed:', error.message);
  }
};

exports.down = async function(db) {
  // Down migration not needed for column addition
  console.log('Down migration for addTempleIdToLedgerCategories - no action taken');
};
