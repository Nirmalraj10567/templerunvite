const path = require('path');
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'deev.sqlite3'),
  },
  useNullAsDefault: true
});

async function addTestMobileUser() {
  try {
    // Check if user already exists
    const existingUser = await knex('user_registrations')
      .where('mobile_number', '9999999999')
      .first();

    if (existingUser) {
      console.log('Test user already exists:');
      console.log(existingUser);
      await knex.destroy();
      return;
    }

    // Insert test user
    const testUser = {
      reference_number: '6672',
      name: 'Test User',
      mobile_number: '9999999999',
      alternative_name: 'Test Alt Name',
      father_name: 'Test Father',
      address: '123 Test Street, Test City',
      postal_code: '600001',
      education: 'Bachelor Degree',
      occupation: 'Engineer',
      aadhaar_number: '1234-5678-9012',
      clan: 'Test Clan',
      group: 'Test Group',
      male_heirs: 1,
      female_heirs: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const [insertedId] = await knex('user_registrations').insert(testUser);

    console.log('Test user added successfully:');
    console.log('ID:', insertedId);
    console.log('Details:', testUser);

    // Also add a test tax payment
    const testTaxPayment = {
      user_id: insertedId,
      year: new Date().getFullYear(),
      amount: 1000,
      paid_amount: 500,
      status: 'partial',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await knex('tax_payments').insert(testTaxPayment);
    console.log('Test tax payment added:');
    console.log(testTaxPayment);

  } catch (error) {
    console.error('Error adding test user:', error);
  } finally {
    await knex.destroy();
  }
}

addTestMobileUser();
