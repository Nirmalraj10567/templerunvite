const knex = require('knex');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite3'
  },
  useNullAsDefault: true
});

async function addApprovalFields() {
  try {
    console.log('Adding approval system fields to pooja table...');
    
    // Add approval system fields
    const fields = [
      "ALTER TABLE pooja ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))",
      "ALTER TABLE pooja ADD COLUMN submitted_by_mobile TEXT",
      "ALTER TABLE pooja ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE pooja ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL",
      "ALTER TABLE pooja ADD COLUMN approved_at TIMESTAMP",
      "ALTER TABLE pooja ADD COLUMN rejection_reason TEXT",
      "ALTER TABLE pooja ADD COLUMN admin_notes TEXT"
    ];
    
    for (const field of fields) {
      try {
        await db.raw(field);
        console.log('✅ Added field:', field.split('ADD COLUMN ')[1]?.split(' ')[0] || 'field');
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('⚠️  Field already exists:', field.split('ADD COLUMN ')[1]?.split(' ')[0] || 'field');
        } else {
          console.error('❌ Error adding field:', error.message);
        }
      }
    }
    
    // Add permissions
    console.log('\nAdding permissions...');
    const permissions = [
      "INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('pooja_approval', 'Pooja Approval', 'Approve or reject pooja requests from mobile users')",
      "INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('pooja_mobile_submit', 'Pooja Mobile Submit', 'Submit pooja requests from mobile app')"
    ];
    
    for (const permission of permissions) {
      try {
        await db.raw(permission);
        console.log('✅ Added permission');
      } catch (error) {
        console.error('❌ Error adding permission:', error.message);
      }
    }
    
    // Grant permissions to roles
    console.log('\nGranting permissions to roles...');
    const rolePermissions = [
      "INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES ('admin', 'pooja_approval', 'full')",
      "INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES ('superadmin', 'pooja_approval', 'full')",
      "INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES ('member', 'pooja_mobile_submit', 'full')"
    ];
    
    for (const rolePermission of rolePermissions) {
      try {
        await db.raw(rolePermission);
        console.log('✅ Granted role permission');
      } catch (error) {
        console.error('❌ Error granting role permission:', error.message);
      }
    }
    
    // Grant specific permission to user with mobile 9999999999
    console.log('\nGranting permission to user 9999999999...');
    try {
      await db.raw(`
        INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
        SELECT u.id, 'pooja_mobile_submit', 'full'
        FROM users u
        WHERE u.mobile = '9999999999'
        AND NOT EXISTS (
          SELECT 1 FROM user_permissions up
          WHERE up.user_id = u.id AND up.permission_id = 'pooja_mobile_submit'
        )
      `);
      console.log('✅ Granted user permission');
    } catch (error) {
      console.error('❌ Error granting user permission:', error.message);
    }
    
    // Check final table structure
    console.log('\nFinal pooja table structure:');
    const tableInfo = await db.raw('PRAGMA table_info(pooja)');
    tableInfo.forEach(col => {
      console.log(`${col.cid}|${col.name}|${col.type}|${col.notnull}|${col.dflt_value}|${col.pk}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

addApprovalFields();
