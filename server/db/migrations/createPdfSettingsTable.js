/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create pdf_settings table if not exists
  const has = await knex.schema.hasTable('pdf_settings');
  if (!has) {
    await knex.schema.createTable('pdf_settings', (t) => {
      t.increments('id').primary();
      t.integer('temple_id').notNullable();
      t.string('title_main', 255);
      t.string('title_sub', 255);
      t.string('title_line2', 512);
      t.string('subheader', 255);
      t.string('tax_subheader', 255);
      t.string('annadhanam_subheader', 255);
      t.string('hall_subheader', 255);
      t.string('logo_url', 512); // relative URL under /public or full URL
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
      t.unique(['temple_id']);
    });
  }

  const hasHallSub = await knex.schema.hasColumn('pdf_settings', 'hall_subheader').catch(() => false);
  if (!hasHallSub) {
    try {
      await knex.schema.table('pdf_settings', (t) => {
        t.string('hall_subheader', 255);
      });
    } catch (e) {
      console.log('Note: Could not add hall_subheader to pdf_settings:', e.message);
    }
  }

  const hasAnnadhanamSub = await knex.schema.hasColumn('pdf_settings', 'annadhanam_subheader').catch(() => false);
  if (!hasAnnadhanamSub) {
    try {
      await knex.schema.table('pdf_settings', (t) => {
        t.string('annadhanam_subheader', 255);
      });
    } catch (e) {
      console.log('Note: Could not add annadhanam_subheader to pdf_settings:', e.message);
    }
  }

  // Ensure new columns exist for existing databases
  const hasTaxSub = await knex.schema.hasColumn('pdf_settings', 'tax_subheader').catch(() => false);
  if (!hasTaxSub) {
    try {
      await knex.schema.table('pdf_settings', (t) => {
        t.string('tax_subheader', 255);
      });
    } catch (e) {
      console.log('Note: Could not add tax_subheader to pdf_settings:', e.message);
    }
  }

  // Ensure watermark_text exists
  const hasWatermark = await knex.schema.hasColumn('pdf_settings', 'watermark_text').catch(() => false);
  if (!hasWatermark) {
    try {
      await knex.schema.table('pdf_settings', (t) => {
        t.string('watermark_text', 255);
      });
    } catch (e) {
      console.log('Note: Could not add watermark_text to pdf_settings:', e.message);
    }
  }

  // Ensure Annadhanam label fields exist
  const annLabels = [
    'annadhanam_receipt_label',
    'annadhanam_date_label',
    'annadhanam_year_label',
    'annadhanam_cell_label',
    'annadhanam_collector_label',
  ];
  for (const col of annLabels) {
    const hasCol = await knex.schema.hasColumn('pdf_settings', col).catch(() => false);
    if (!hasCol) {
      try {
        await knex.schema.table('pdf_settings', (t) => {
          t.string(col, 255);
        });
      } catch (e) {
        console.log(`Note: Could not add ${col} to pdf_settings:`, e.message);
      }
    }
  }

  // Seed default for temple_id = 1 if missing
  const existing = await knex('pdf_settings').where({ temple_id: 1 }).first().catch(() => null);
  if (!existing) {
    await knex('pdf_settings').insert({
      temple_id: 1,
      title_main: 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்',
      title_sub: 'அருள்மிகு நல்லகுமாரசுவாமி துணை',
      title_line2: 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம்,கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்',
      subheader: 'நன்கொடை ரسீது',
      tax_subheader: 'வரி ரசீது',
      annadhanam_subheader: 'அன்னதானம் ரசீது',
      hall_subheader: 'மண்டப முன்பதிவு ரசீது',
      logo_url: null,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('pdf_settings');
};
