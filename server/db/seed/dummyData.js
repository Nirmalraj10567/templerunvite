/**
 * Dummy data for testing and development
 */

/**
 * Creates dummy tax registration data for testing
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createDummyTaxRegistrations(db) {
  const existingTaxRegs = await db('user_tax_registrations').where('temple_id', 1).first();
  if (existingTaxRegs) return;

  const dummyTaxRegistrations = [
    // User 1: Registered in 2023, partial payment
    {
      temple_id: 1,
      reference_number: 'TAX-2023-001',
      date: '2023-03-15',
      subdivision: 'subdivision1',
      name: 'Raman Kumar',
      father_name: 'Krishnan Kumar',
      address: '123 Temple Street, Village A',
      mobile_number: '9876543210',
      aadhaar_number: '123456789012',
      clan: 'Bharadwaja',
      group: 'Group A',
      year: 2023,
      tax_amount: 450.00,
      amount_paid: 200.00,
      outstanding_amount: 250.00,
      created_at: '2023-03-15 10:00:00',
      updated_at: '2023-03-15 10:00:00'
    },
    // User 2: Registered in 2024, full payment
    {
      temple_id: 1,
      reference_number: 'TAX-2024-001',
      date: '2024-04-10',
      subdivision: 'subdivision2',
      name: 'Lakshmi Devi',
      father_name: 'Venkat Rao',
      address: '456 Main Road, Village B',
      mobile_number: '9876543211',
      aadhaar_number: '123456789013',
      clan: 'Kashyapa',
      group: 'Group B',
      year: 2024,
      tax_amount: 500.00,
      amount_paid: 500.00,
      outstanding_amount: 0.00,
      created_at: '2024-04-10 11:00:00',
      updated_at: '2024-04-10 11:00:00'
    },
    // User 3: Registered in 2024, no payment (full outstanding)
    {
      temple_id: 1,
      reference_number: 'TAX-2024-002',
      date: '2024-05-20',
      subdivision: 'subdivision3',
      name: 'Suresh Babu',
      father_name: 'Raghavan Babu',
      address: '789 East Street, Village C',
      mobile_number: '9876543212',
      aadhaar_number: '123456789014',
      clan: 'Vasishta',
      group: 'Group C',
      year: 2024,
      tax_amount: 500.00,
      amount_paid: 0.00,
      outstanding_amount: 500.00,
      created_at: '2024-05-20 12:00:00',
      updated_at: '2024-05-20 12:00:00'
    }
  ];

  for (const reg of dummyTaxRegistrations) {
    await db('user_tax_registrations').insert(reg);
  }
  console.log('Created dummy tax registrations for testing');
}

/**
 * Creates default admin users if they don't exist
 * @param {Object} db - Knex database instance
 * @param {Object} bcrypt - bcrypt instance for password hashing
 * @returns {Promise<void>}
 */
async function createDefaultUsers(db, bcrypt) {
  // Create default superadmin user if not exists
  const superadminExists = await db('users').where({ username: 'superadmin' }).first();
  if (!superadminExists) {
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    await db('users').insert({
      mobile: '9999999998',
      username: 'superadmin',
      password: hashedPassword,
      email: 'superadmin@temple.com',
      full_name: 'Super Administrator',
      temple_id: 1,
      role: 'superadmin',
      status: 'active'
    });
    console.log('Created default superadmin user');
  }

  // Create default admin user if not exists
  const adminExists = await db('users').where({ username: 'admin' }).first();
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db('users').insert({
      mobile: '8888888887',
      username: 'admin',
      password: hashedPassword,
      email: 'admin@temple.com',
      full_name: 'Administrator',
      temple_id: 1,
      role: 'admin',
      status: 'active'
    });
    console.log('Created default admin user');
  }
}

module.exports = {
  createDummyTaxRegistrations,
  createDefaultUsers
};
