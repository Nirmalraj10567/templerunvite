const knex = require('knex');
const config = require('./server/knexfile.cjs');

async function runMigration() {
  const db = knex(config.development);
  
  try {
    console.log('Running comprehensive migration for tax registration fixes...');
    
    // 1. Fix user_tax_registrations table
    console.log('1. Fixing user_tax_registrations table...');
    
    // Make reference_number nullable
    try {
      await db.schema.alterTable('user_tax_registrations', function(table) {
        table.string('reference_number', 255).nullable().alter();
      });
      console.log('✅ Made reference_number nullable');
    } catch (e) {
      console.log('ℹ️  reference_number column already nullable or error:', e.message);
    }
    
    // Add member_id column if it doesn't exist
    const hasMemberId = await db.schema.hasColumn('user_tax_registrations', 'member_id');
    if (!hasMemberId) {
      console.log('Adding member_id column...');
      await db.schema.alterTable('user_tax_registrations', function(table) {
        table.integer('member_id').nullable().after('temple_id');
      });
      console.log('✅ Added member_id column');
    } else {
      console.log('ℹ️  member_id column already exists');
    }
    
    // Add from_account column if it doesn't exist
    const hasFromAccount = await db.schema.hasColumn('user_tax_registrations', 'from_account');
    if (!hasFromAccount) {
      console.log('Adding from_account column...');
      await db.schema.alterTable('user_tax_registrations', function(table) {
        table.string('from_account').defaultTo('TAX A/C');
      });
      console.log('✅ Added from_account column');
    } else {
      console.log('ℹ️  from_account column already exists');
    }
    
    // Add transfer_to_account column if it doesn't exist
    const hasTransferToAccount = await db.schema.hasColumn('user_tax_registrations', 'transfer_to_account');
    if (!hasTransferToAccount) {
      console.log('Adding transfer_to_account column...');
      await db.schema.alterTable('user_tax_registrations', function(table) {
        table.string('transfer_to_account').defaultTo('INCOME A/C');
      });
      console.log('✅ Added transfer_to_account column');
    } else {
      console.log('ℹ️  transfer_to_account column already exists');
    }
    
    // 2. Fix journal_entries table
    console.log('2. Fixing journal_entries table...');
    
    // Add reference_number column if it doesn't exist
    const hasJournalRefNumber = await db.schema.hasColumn('journal_entries', 'reference_number');
    if (!hasJournalRefNumber) {
      console.log('Adding reference_number column to journal_entries...');
      await db.schema.alterTable('journal_entries', function(table) {
        table.string('reference_number', 255).nullable();
      });
      console.log('✅ Added reference_number column to journal_entries');
    } else {
      console.log('ℹ️  reference_number column already exists in journal_entries');
    }
    
    // 3. Show current table structures
    console.log('3. Current table structures:');
    
    const taxColumns = await db('user_tax_registrations').columnInfo();
    console.log('user_tax_registrations columns:', Object.keys(taxColumns).join(', '));
    
    const journalColumns = await db('journal_entries').columnInfo();
    console.log('journal_entries columns:', Object.keys(journalColumns).join(', '));
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
  } finally {
    await db.destroy();
  }
}

runMigration();
