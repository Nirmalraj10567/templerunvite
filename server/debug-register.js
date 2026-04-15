/**
 * Debug registration error
 * Run with: node debug-register.js
 */

const bcrypt = require('bcryptjs');
const db = require('./db');

async function debugRegistration() {
  console.log('='.repeat(60));
  console.log('DEBUG REGISTRATION');
  console.log('='.repeat(60));

  try {
    const mobile = '9999999998';
    const username = 'test_user2';
    const password = 'test123';
    const email = 'test2@example.com';
    const fullName = 'Test User 2';

    console.log('\n1. Checking if user already exists...');
    const exists = await db('users')
      .where({ mobile })
      .orWhere({ username })
      .first();

    if (exists) {
      console.log('❌ User already exists!');
      return;
    }
    console.log('✅ User does not exist - can proceed');

    console.log('\n2. Checking temple...');
    const temple = await db('temples').where('id', 1).first();
    if (!temple) {
      console.log('❌ Temple not found!');
      return;
    }
    console.log('✅ Temple found:', temple.name);

    console.log('\n3. Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');

    console.log('\n4. Inserting user...');
    const safeEmail = email || `${username}@generated.local`;
    
    const [insertId] = await db('users').insert({
      mobile,
      username,
      password: hashedPassword,
      email: safeEmail,
      full_name: fullName,
      temple_id: 1,
      role: 'admin',
    });

    console.log('✅ User inserted with ID:', insertId);

    console.log('\n5. Inserting permissions...');
    const ALL_PERMISSION_IDS = [
      'dashboard', 'member_entry', 'master_data', 'balance_sheet',
      'ledger_management', 'transaction', 'report', 'reports',
      'setting', 'pdf_settings', 'property_registrations',
      'view_donations', 'edit_donations', 'receipts', 'donation_approval',
      'session_logs', 'view_session_logs', 'activity_logs',
      'tax_registrations', 'marriage_register', 'user_registrations',
      'pooja_registrations', 'pooja_approval', 'hall_booking',
      'hall_approval', 'view_events', 'edit_events',
      'annadhanam_registrations', 'annadhanam_approval', 'daybook',
    ];

    const PERMISSION_NAMES = {
      dashboard: 'Dashboard',
      member_entry: 'Member Entry',
      master_data: 'Master Data',
      balance_sheet: 'Balance Sheet',
      ledger_management: 'Ledger Management',
      transaction: 'Transactions',
      report: 'Reports',
      reports: 'Reports',
      setting: 'Settings',
      pdf_settings: 'PDF Settings',
      property_registrations: 'Property Registrations',
      view_donations: 'View Donations',
      edit_donations: 'Edit Donations',
      receipts: 'Receipts',
      donation_approval: 'Donation Approval',
      session_logs: 'Session Logs',
      view_session_logs: 'Session Logs',
      activity_logs: 'Activity Logs',
      tax_registrations: 'Tax Registrations',
      user_registrations: 'User Registrations',
      pooja_registrations: 'Pooja Registrations',
      pooja_approval: 'Pooja Approval',
      hall_booking: 'Hall Booking',
      hall_approval: 'Hall Approval',
      view_events: 'View Events',
      edit_events: 'Edit Events',
      annadhanam_registrations: 'Annadhanam Registrations',
      annadhanam_approval: 'Annadhanam Approval',
      daybook: 'Daybook',
    };

    // Check if permissions table exists
    const hasTable = await db.schema.hasTable('permissions');
    if (!hasTable) {
      console.log('❌ permissions table does not exist!');
      return;
    }
    console.log('✅ permissions table exists');

    // Try to insert permissions
    const permRows = ALL_PERMISSION_IDS.map(id => ({
      id,
      name: PERMISSION_NAMES[id] || id,
      description: null
    }));

    try {
      console.log('Attempting to insert permissions...');
      
      // MySQL doesn't support onConflict, use INSERT IGNORE
      if (db.client.config.client === 'mysql2') {
        await db.raw(
          'INSERT IGNORE INTO permissions (id, name, description) VALUES ?',
          [permRows.map(p => [p.id, p.name, p.description])]
        );
        console.log('✅ Permissions inserted (MySQL mode)');
      } else {
        await db('permissions')
          .insert(permRows)
          .onConflict('id')
          .ignore();
        console.log('✅ Permissions inserted (other mode)');
      }
    } catch (e) {
      console.log('⚠️ Permission insert failed:', e.message);
      console.log('Trying alternative method...');
      
      // Try inserting one by one
      for (const perm of permRows) {
        try {
          const exists = await db('permissions').where('id', perm.id).first();
          if (!exists) {
            await db('permissions').insert(perm);
          }
        } catch (innerErr) {
          console.log(`  Failed to insert ${perm.id}: ${innerErr.message}`);
        }
      }
      console.log('✅ Permissions inserted (fallback mode)');
    }

    console.log('\n6. Inserting user permissions...');
    const existingPermissions = await db('permissions')
      .select('id')
      .whereIn('id', ALL_PERMISSION_IDS);

    console.log(`Found ${existingPermissions.length} existing permissions`);

    const permInsertData = existingPermissions.map(p => ({
      user_id: insertId,
      permission_id: p.id,
      access_level: 'full'
    }));

    await db('user_permissions').insert(permInsertData);
    console.log(`✅ Inserted ${permInsertData.length} user permissions`);

    console.log('\n' + '='.repeat(60));
    console.log('REGISTRATION WOULD SUCCEED');
    console.log('='.repeat(60));
    console.log(`\nUser ID: ${insertId}`);
    console.log(`Username: ${username}`);
    console.log(`Temple: ${temple.name}\n`);

  } catch (err) {
    console.error('\n❌ REGISTRATION ERROR:', err.message);
    console.error('Full error:', err);
    console.error('\nSQL State:', err.sqlState);
    console.error('SQL Message:', err.sqlMessage);
  } finally {
    await db.destroy();
  }
}

debugRegistration();
