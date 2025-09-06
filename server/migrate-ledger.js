const db = require('./db');

async function runMigrations() {
  try {
    console.log('Running ledger migrations...');
    
    // First, check if table exists and show current structure
    const tableInfo = await db.raw("PRAGMA table_info(ledger_entries)");
    console.log('Current ledger entries table structure:', tableInfo);
    
    // Check if the table has the old structure (from backend.js migration)
    const hasOldStructure = tableInfo.some(col => col.name === 'donor_name');
    
    if (hasOldStructure) {
      console.log('Found old table structure, migrating to new structure...');
      
      // Create new table with correct structure
      await db.raw(`
        CREATE TABLE IF NOT EXISTS ledger_entries_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            name TEXT NOT NULL,
            under TEXT,
            type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
            amount DECIMAL(10, 2) NOT NULL,
            address TEXT,
            city TEXT,
            phone TEXT,
            mobile TEXT,
            email TEXT,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Copy data from old table to new table (if any exists)
      // Set default type as 'credit' for existing entries
      await db.raw(`
        INSERT INTO ledger_entries_new (date, name, type, amount, created_at, updated_at)
        SELECT date, donor_name, 'credit', amount, created_at, updated_at 
        FROM ledger_entries
        WHERE donor_name IS NOT NULL;
      `);
      
      // Drop old table and rename new table
      await db.raw('DROP TABLE ledger_entries;');
      await db.raw('ALTER TABLE ledger_entries_new RENAME TO ledger_entries;');
      
      console.log('Table structure migrated successfully');
    } else {
      // Create table if it doesn't exist
      await db.raw(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            name TEXT NOT NULL,
            under TEXT,
            type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
            amount DECIMAL(10, 2) NOT NULL,
            address TEXT,
            city TEXT,
            phone TEXT,
            mobile TEXT,
            email TEXT,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    // Create indexes
    await db.raw('CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date);');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_ledger_entries_name ON ledger_entries(name);');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_ledger_entries_under ON ledger_entries(under);');
    
    console.log('Ledger tables and indexes created successfully');
    
    // Show final table structure
    const finalTableInfo = await db.raw("PRAGMA table_info(ledger_entries)");
    console.log('Final ledger entries table structure:', finalTableInfo);
    
    // Add some sample data for testing
    const existingEntries = await db('ledger_entries').count('* as count').first();
    if (existingEntries.count === 0) {
      console.log('Adding sample data...');
      await db('ledger_entries').insert([
        {
          date: '2024-01-15',
          name: 'Opening Balance',
          type: 'credit',
          amount: 10000.00,
          note: 'Initial balance',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        },
        {
          date: '2024-01-16',
          name: 'Office Supplies',
          under: 'Expenses',
          type: 'debit',
          amount: 500.00,
          note: 'Purchased office supplies',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        },
        {
          date: '2024-01-17',
          name: 'Donation Received',
          under: 'Income',
          type: 'credit',
          amount: 2000.00,
          note: 'Donation from devotee',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        }
      ]);
      console.log('Sample data added successfully');
    }
    
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

runMigrations();