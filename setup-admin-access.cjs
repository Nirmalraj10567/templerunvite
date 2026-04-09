const knex = require('knex');

async function setupAdminAccess() {
  const db = knex({
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'rootroot',
      database: 'temple',
    }
  });

  try {
    console.log('🔧 Setting up admin access...\n');
    
    // 1. Get testadmin user ID
    const user = await db('users').where({ username: 'testadmin' }).first();
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log('✅ Found user:', user.username, '(ID:', user.id + ')');
    
    // 2. Check available permissions
    const allPermissions = await db('permissions').select('*');
    console.log('\n📋 Available permissions:', allPermissions.length);
    allPermissions.forEach(p => {
      console.log('  -', p.id + ':', p.name, '(' + p.code + ')');
    });
    
    // 3. Grant all permissions to testadmin
    console.log('\n🔑 Granting permissions to testadmin...');
    
    // First clear existing permissions
    await db('user_permissions').where({ user_id: user.id }).delete();
    
    // Grant all permissions with full access
    const permissionIds = allPermissions.map(p => p.id);
    for (const permId of permissionIds) {
      await db('user_permissions').insert({
        user_id: user.id,
        permission_id: permId,
        access_level: 'full',
        created_at: new Date()
      });
    }
    console.log('✅ Granted', permissionIds.length, 'permissions');
    
    // 4. Seed family chain data for temple 12 (nirmal)
    console.log('\n🌱 Seeding family chain data for temple nirmal (ID: 12)...');
    
    const templeId = 12;
    const now = new Date();
    
    // Check if data already exists
    const existing = await db('user_tax_registrations')
      .where({ temple_id: templeId, reference_number: 'T-2024-001' })
      .first();
    
    if (existing) {
      console.log('ℹ️ Family data already exists for this temple');
    } else {
      // Grandfather
      await db('user_tax_registrations').insert({
        temple_id: templeId,
        reference_number: 'T-2024-001',
        date: '2024-01-15',
        year: 2024,
        name: 'Ramasamy Nadar',
        alternative_name: 'Ramasamy',
        gender: 'male',
        marital_status: 'married',
        wife_name: 'Lakshmi Ammal',
        father_name: 'Periyasamy',
        address: '123 Main Street, Chennai',
        village: 'Chennai',
        mobile_number: '9876543001',
        aadhaar_number: '123456789001',
        pan_number: 'ABCDE1001F',
        clan: 'Nadar',
        postal_code: '626123',
        male_heirs: 2,
        female_heirs: 1,
        tax_amount: 1500,
        amount_paid: 1500,
        outstanding_amount: 0,
        from_account: 'TAX A/C',
        relationship_type: 'self',
        family_head_reference: 'T-2024-001',
        created_at: now,
        updated_at: now
      });
      console.log('  ✅ Grandfather created');
      
      // Father
      await db('user_tax_registrations').insert({
        temple_id: templeId,
        reference_number: 'T-2024-015',
        date: '2024-02-20',
        year: 2024,
        name: 'Muthusamy Nadar',
        alternative_name: 'Muthu',
        gender: 'male',
        marital_status: 'married',
        wife_name: 'Kamatchi',
        wife_father_name: 'Govindan',
        father_name: 'Ramasamy Nadar',
        address: '123 Main Street, Chennai',
        village: 'Chennai',
        mobile_number: '9876543020',
        aadhaar_number: '123456789015',
        pan_number: 'ABCDE1015F',
        clan: 'Nadar',
        postal_code: '626123',
        male_heirs: 1,
        female_heirs: 0,
        tax_amount: 1000,
        amount_paid: 1000,
        outstanding_amount: 0,
        from_account: 'TAX A/C',
        relationship_type: 'self',
        parent_reference_id: 'T-2024-001',
        family_head_reference: 'T-2024-001',
        created_at: now,
        updated_at: now
      });
      console.log('  ✅ Father created (linked to grandfather)');
      
      // Son
      await db('user_tax_registrations').insert({
        temple_id: templeId,
        reference_number: 'T-2024-045',
        date: '2024-04-10',
        year: 2024,
        name: 'Karthik Nadar',
        alternative_name: 'Karthi',
        gender: 'male',
        marital_status: 'married',
        wife_name: 'Divya',
        wife_father_name: 'Ranganathan',
        father_name: 'Muthusamy Nadar',
        address: '45 New Street, Chennai',
        village: 'Chennai',
        mobile_number: '9876543045',
        aadhaar_number: '123456789045',
        pan_number: 'ABCDE1045F',
        clan: 'Nadar',
        postal_code: '626124',
        male_heirs: 0,
        female_heirs: 0,
        tax_amount: 800,
        amount_paid: 800,
        outstanding_amount: 0,
        from_account: 'TAX A/C',
        relationship_type: 'self',
        parent_reference_id: 'T-2024-015',
        family_head_reference: 'T-2024-001',
        created_at: now,
        updated_at: now
      });
      console.log('  ✅ Son created (linked to father)');
      
      console.log('\n📊 Family Tree:');
      console.log('  🧓 Ramasamy (T-2024-001) [Family Head]');
      console.log('     └── 👨 Muthusamy (T-2024-015) [Son]');
      console.log('            └── 👶 Karthik (T-2024-045) [Grandson]');
    }
    
    console.log('\n✅ Setup complete!');
    console.log('\n🔐 Login with:');
    console.log('  Username: testadmin');
    console.log('  Password: test123');
    console.log('  Temple: nirmal');
    console.log('\n🎨 Test the Family Chain:');
    console.log('  1. Login and go to Tax → User Entry');
    console.log('  2. Select Gender=Male, Marital=Married');
    console.log('  3. Enter T-2024-001 in Family Search');
    console.log('  4. Click 🔍 to auto-fill from grandfather');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

setupAdminAccess();
