const knex = require('knex');
const path = require('path');

// Database configuration
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'server/deev.sqlite3')
  },
  useNullAsDefault: true
});

async function seedFamilyChainData() {
  try {
    console.log('🌱 Seeding Family Chain Test Data...\n');

    const templeId = 1;
    const now = new Date().toISOString();

    // 1. Create Grandfather (Family Head)
    console.log('1️⃣ Creating Grandfather (Family Head)...');
    const grandfatherRef = 'T-2024-001';
    const [grandfatherId] = await db('user_tax_registrations').insert({
      temple_id: templeId,
      reference_number: grandfatherRef,
      date: '2024-01-15',
      year: 2024,
      name: 'Ramasamy Nadar',
      alternative_name: 'Ramasamy',
      gender: 'male',
      marital_status: 'married',
      wife_name: 'Lakshmi Ammal',
      father_name: 'Periyasamy',
      address: '123 Main Street, Sivakasi',
      village: 'Sivakasi',
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
      family_head_reference: grandfatherRef, // He is the head
      created_at: now,
      updated_at: now
    });
    console.log(`   ✅ Grandfather created: ID ${grandfatherId}, Ref: ${grandfatherRef}`);

    // 2. Create Father (Son of Grandfather)
    console.log('\n2️⃣ Creating Father (Son of Grandfather)...');
    const fatherRef = 'T-2024-015';
    const [fatherId] = await db('user_tax_registrations').insert({
      temple_id: templeId,
      reference_number: fatherRef,
      date: '2024-02-20',
      year: 2024,
      name: 'Muthusamy Nadar',
      alternative_name: 'Muthu',
      gender: 'male',
      marital_status: 'married',
      wife_name: 'Kamatchi',
      wife_father_name: 'Govindan',
      father_name: 'Ramasamy Nadar', // Same as grandfather's name
      address: '123 Main Street, Sivakasi', // Inherited from father
      village: 'Sivakasi',
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
      parent_reference_id: grandfatherRef, // Links to grandfather
      family_head_reference: grandfatherRef, // Same family head
      created_at: now,
      updated_at: now
    });
    console.log(`   ✅ Father created: ID ${fatherId}, Ref: ${fatherRef}`);
    console.log(`   🔗 Linked to Grandfather: ${grandfatherRef}`);

    // 3. Create Uncle (Another Son of Grandfather)
    console.log('\n3️⃣ Creating Uncle (Another Son of Grandfather)...');
    const uncleRef = 'T-2024-016';
    const [uncleId] = await db('user_tax_registrations').insert({
      temple_id: templeId,
      reference_number: uncleRef,
      date: '2024-02-25',
      year: 2024,
      name: 'Palaniappan Nadar',
      alternative_name: 'Palani',
      gender: 'male',
      marital_status: 'married',
      wife_name: 'Meenakshi',
      wife_father_name: 'Krishnan',
      father_name: 'Ramasamy Nadar',
      address: '123 Main Street, Sivakasi',
      village: 'Sivakasi',
      mobile_number: '9876543021',
      aadhaar_number: '123456789016',
      pan_number: 'ABCDE1016F',
      clan: 'Nadar',
      postal_code: '626123',
      male_heirs: 0,
      female_heirs: 2,
      tax_amount: 1200,
      amount_paid: 1200,
      outstanding_amount: 0,
      from_account: 'TAX A/C',
      relationship_type: 'self',
      parent_reference_id: grandfatherRef, // Also links to same grandfather
      family_head_reference: grandfatherRef,
      created_at: now,
      updated_at: now
    });
    console.log(`   ✅ Uncle created: ID ${uncleId}, Ref: ${uncleRef}`);
    console.log(`   🔗 Also linked to Grandfather: ${grandfatherRef}`);

    // 4. Create Son (Grandson of Grandfather, Son of Father)
    console.log('\n4️⃣ Creating Son (Grandson - 3rd Generation)...');
    const sonRef = 'T-2024-045';
    const [sonId] = await db('user_tax_registrations').insert({
      temple_id: templeId,
      reference_number: sonRef,
      date: '2024-04-10',
      year: 2024,
      name: 'Karthik Nadar',
      alternative_name: 'Karthi',
      gender: 'male',
      marital_status: 'married',
      wife_name: 'Divya',
      wife_father_name: 'Ranganathan',
      father_name: 'Muthusamy Nadar', // Father's name
      address: '45 New Street, Sivakasi', // His own address (separate branch)
      village: 'Sivakasi',
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
      parent_reference_id: fatherRef, // Links to his father
      family_head_reference: grandfatherRef, // Still same family head
      created_at: now,
      updated_at: now
    });
    console.log(`   ✅ Son created: ID ${sonId}, Ref: ${sonRef}`);
    console.log(`   🔗 Linked to Father: ${fatherRef}`);
    console.log(`   🔗 Family Head: ${grandfatherRef}`);

    // 5. Create an unmarried male (no family link)
    console.log('\n5️⃣ Creating Unmarried Male (No Family Link)...');
    const unmarriedRef = 'T-2024-050';
    const [unmarriedId] = await db('user_tax_registrations').insert({
      temple_id: templeId,
      reference_number: unmarriedRef,
      date: '2024-05-01',
      year: 2024,
      name: 'Suresh Kumar',
      gender: 'male',
      marital_status: 'unmarried',
      father_name: 'Venkatachalam',
      address: '78 East Street, Chennai',
      village: 'Chennai',
      mobile_number: '9876543050',
      aadhaar_number: '123456789050',
      clan: 'Nadar',
      tax_amount: 500,
      amount_paid: 500,
      outstanding_amount: 0,
      from_account: 'TAX A/C',
      relationship_type: 'self',
      // No parent_reference_id - he is his own family head
      family_head_reference: null,
      created_at: now,
      updated_at: now
    });
    console.log(`   ✅ Unmarried male created: ID ${unmarriedId}, Ref: ${unmarriedRef}`);
    console.log(`   📝 No family link (independent registration)`);

    // 6. Create a married female (no family section needed)
    console.log('\n6️⃣ Creating Married Female (No Family Section)...');
    const femaleRef = 'T-2024-055';
    const [femaleId] = await db('user_tax_registrations').insert({
      temple_id: templeId,
      reference_number: femaleRef,
      date: '2024-05-15',
      year: 2024,
      name: 'Priya Muthusamy',
      gender: 'female',
      marital_status: 'married',
      father_name: 'Govindan', // Her father's name (not linked to husband)
      address: '123 Main Street, Sivakasi',
      village: 'Sivakasi',
      mobile_number: '9876543055',
      aadhaar_number: '123456789055',
      clan: 'Nadar',
      tax_amount: 0, // Often no tax for married women
      amount_paid: 0,
      outstanding_amount: 0,
      from_account: 'TAX A/C',
      relationship_type: 'spouse',
      parent_reference_id: null,
      family_head_reference: null,
      created_at: now,
      updated_at: now
    });
    console.log(`   ✅ Married female created: ID ${femaleId}, Ref: ${femaleRef}`);
    console.log(`   📝 No family reference section (per flowchart)`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 Family Tree Structure:');
    console.log('  🧓 Ramasamy (T-2024-001) [Family Head]');
    console.log('     ├── 👨 Muthusamy (T-2024-015) [Son]');
    console.log('     │      └── 👶 Karthik (T-2024-045) [Grandson]');
    console.log('     └── 👨 Palaniappan (T-2024-016) [Son]');
    console.log('\n📋 Independent Registrations:');
    console.log('     👤 Suresh (T-2024-050) [Unmarried Male]');
    console.log('     👩 Priya (T-2024-055) [Married Female]');
    console.log('\n🔍 Test the API:');
    console.log(`   GET /api/tax-registrations/by-reference/T-2024-001`);
    console.log(`   GET /api/tax-registrations/family-tree/T-2024-001`);
    console.log(`   GET /api/tax-registrations/family-tree/T-2024-015`);
    console.log('\n🎨 Test the UI:');
    console.log('   1. Go to Tax → User Entry');
    console.log('   2. Enter reference T-2024-001 in Family Search');
    console.log('   3. Click 🔍 to auto-fill family details');
    console.log('   4. Select Gender=Male, Marital=Married');
    console.log('   5. See Wife Details section appear');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

// Run the seed function
seedFamilyChainData();
