/**
 * Seeds the tax_settings table with initial data
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function seedTaxSettingsData(db) {
  // Add dummy tax settings for 2023, 2024, 2025 if not exists
  const existingTaxSettings = await db('tax_settings').where('temple_id', 1).select('year');
  const existingYears = existingTaxSettings.map(s => s.year);
  
  const dummyTaxSettings = [
    { 
      temple_id: 1,
      year: 2023, 
      tax_amount: 450.00, 
      description: 'Landowners Tax 2023', 
      include_previous_years: true,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    },
    { 
      temple_id: 1,
      year: 2024, 
      tax_amount: 500.00, 
      description: 'Landowners Tax 2024', 
      include_previous_years: true,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    },
    { 
      temple_id: 1,
      year: 2025, 
      tax_amount: 600.00, 
      description: 'Landowners Tax 2025', 
      include_previous_years: false,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }
  ];

  for (const setting of dummyTaxSettings) {
    if (!existingYears.includes(setting.year)) {
      await db('tax_settings').insert(setting);
      console.log(`Added tax setting for year ${setting.year}`);
    }
  }
}

module.exports = seedTaxSettingsData;
