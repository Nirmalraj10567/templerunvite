const PDFDocument = require('pdfkit');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const knex = require('knex');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 4000;

// Import routes
const propertiesRouter = require('./properties');
const ledgerRouter = require('./routes/ledger');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4002',"http://localhost:64095/",'http://localhost:4000', 'http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Serve static files from the project's public directory (../public)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Mount routes
app.use('/api/properties', propertiesRouter);
app.use('/api/ledger', ledgerRouter);

// Add receipts endpoints (CRUD)
app.post('/api/receipts', authenticateToken, async (req, res) => {
  try {
    const b = req.body || {};
    // Accept both old and new payload shapes
    const registerNo = b.registerNo || b.receiptNumber;
    const date = b.date;
    // Map type: 'income'|'expense' (new) -> 'receipt'|'payment' (db). Accept old values too
    const type = b.type === 'income' ? 'receipt' : b.type === 'expense' ? 'payment' : (b.type || 'receipt');
    const fromPerson = b.fromPerson || b.donor || '';
    const toPerson = b.toPerson || b.receiver || '';
    const amount = Number(b.amount);
    const remarks = b.remarks || null;

    if (!registerNo || !date || !type || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Missing or invalid fields: registerNo/receiptNumber, date, type, amount' });
    }

    const inserted = await db('receipts').insert({
      register_no: String(registerNo),
      date,
      type, // stored as 'receipt' or 'payment'
      from_person: fromPerson || null,
      to_person: toPerson || null,
      amount,
      remarks,
      created_by: req.user.id,
      temple_id: req.user.templeId,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning('*');

    const r = inserted[0] || { id: inserted[0] };
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('Error saving receipt:', err);
    res.status(500).json({ error: 'Failed to save receipt' });
  }
});

app.get('/api/receipts', authenticateToken, async (req, res) => {
  try {
    const { from, to, q, type, page = 1, pageSize = 20 } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (pg - 1) * ps;

    let query = db('receipts')
      .where('temple_id', req.user.templeId)
      .modify((qb) => {
        if (from) qb.andWhere('date', '>=', from);
        if (to) qb.andWhere('date', '<=', to);
        if (type) {
          const dbType = type === 'expense' ? 'payment' : type === 'income' ? 'receipt' : type;
          qb.andWhere('type', dbType);
        }
        if (q) {
          qb.andWhere((b) => {
            b.where('register_no', 'like', `%${q}%`)
             .orWhere('from_person', 'like', `%${q}%`)
             .orWhere('to_person', 'like', `%${q}%`);
          });
        }
      })
      .orderBy('date', 'desc')
      .limit(ps)
      .offset(offset);

    const rows = await query.select('*');
    // Map to frontend shape
    const data = rows.map(r => ({
      id: r.id,
      receipt_number: r.register_no,
      date: r.date,
      type: r.type === 'payment' ? 'expense' : 'income',
      donor: r.from_person,
      receiver: r.to_person,
      amount: r.amount,
      remarks: r.remarks,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching receipts:', err);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// CSV export
app.get('/api/receipts/export', authenticateToken, async (req, res) => {
  try {
    const { from, to, q, type } = req.query;
    let query = db('receipts')
      .where('temple_id', req.user.templeId)
      .modify((qb) => {
        if (from) qb.andWhere('date', '>=', from);
        if (to) qb.andWhere('date', '<=', to);
        if (type) {
          const dbType = type === 'expense' ? 'payment' : type === 'income' ? 'receipt' : type;
          qb.andWhere('type', dbType);
        }
        if (q) {
          qb.andWhere((b) => {
            b.where('register_no', 'like', `%${q}%`)
             .orWhere('from_person', 'like', `%${q}%`)
             .orWhere('to_person', 'like', `%${q}%`);
          });
        }
      })
      .orderBy('date', 'desc');

    const rows = await query.select('*');
    const headers = ['id','receipt_number','date','type','donor','receiver','amount','remarks','created_at'];
    const csvRows = rows.map(r => [
      r.id,
      r.register_no,
      r.date,
      r.type === 'payment' ? 'expense' : 'income',
      (r.from_person || '').replaceAll(',', ' '),
      (r.to_person || '').replaceAll(',', ' '),
      r.amount,
      (r.remarks || '').replaceAll(',', ' '),
      r.created_at
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="receipts.csv"');
    res.send(headers.join(',') + '\n' + csvRows.join('\n'));
  } catch (err) {
    console.error('Error exporting receipts CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Get single
app.get('/api/receipts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await db('receipts')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .first();
    if (!r) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ success: true, data: {
      id: r.id,
      receipt_number: r.register_no,
      date: r.date,
      type: r.type === 'payment' ? 'expense' : 'income',
      donor: r.from_person,
      receiver: r.to_person,
      amount: r.amount,
      remarks: r.remarks,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }});
  } catch (err) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// Update
app.put('/api/receipts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const date = b.date;
    const type = b.type === 'income' ? 'receipt' : b.type === 'expense' ? 'payment' : (b.type || 'receipt');
    const fromPerson = b.fromPerson || b.donor || null;
    const toPerson = b.toPerson || b.receiver || null;
    const amount = b.amount != null ? Number(b.amount) : null;
    const remarks = b.remarks ?? null;

    const exists = await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).first();
    if (!exists) return res.status(404).json({ error: 'Receipt not found' });

    const updateData = {
      ...(date ? { date } : {}),
      ...(b.type ? { type } : {}),
      ...(fromPerson !== undefined ? { from_person: fromPerson } : {}),
      ...(toPerson !== undefined ? { to_person: toPerson } : {}),
      ...(amount !== null && !isNaN(amount) ? { amount } : {}),
      ...(remarks !== undefined ? { remarks } : {}),
      updated_at: db.fn.now(),
    };

    await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).update(updateData);
    const r = await db('receipts').where({ id }).first();
    res.json({ success: true, data: {
      id: r.id,
      receipt_number: r.register_no,
      date: r.date,
      type: r.type === 'payment' ? 'expense' : 'income',
      donor: r.from_person,
      receiver: r.to_person,
      amount: r.amount,
      remarks: r.remarks,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }});
  } catch (err) {
    console.error('Error updating receipt:', err);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// Delete
app.delete('/api/receipts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).del();
    if (!del) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting receipt:', err);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// Knex config for SQLite (database in server directory)
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'deev.sqlite3'),
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, cb) => {
      conn.run('PRAGMA busy_timeout = 5000', cb);
    }
  }
});

// Mount mobile routes (no authentication required) - AFTER DB INIT
const poojaMobileRouter = require('./pooja-mobile')({ db });
app.use('/api/pooja-mobile', poojaMobileRouter);

const mobileAuthRouter = require('./mobile-auth')({ db });
app.use('/api/mobile-auth', mobileAuthRouter);

// Hall mobile routes
const hallMobileRouter = require('./hall-mobile')({ db });
app.use('/api/hall-mobile', hallMobileRouter);

// Annadhanam mobile routes
const annadhanamMobileRouter = require('./annadhanam-mobile')({ db });
app.use('/api/annadhanam-mobile', annadhanamMobileRouter);

// Donations mobile routes
const donationsMobileRouter = require('./donations-mobile')({ db });
app.use('/api/donations-mobile', donationsMobileRouter);

// Hall admin approval routes (protected) - mounted after authorizePermission is defined

// Function to retry database operations on SQLITE_BUSY
const retryOnBusy = async (fn, maxRetries = 5, delay = 100) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code === 'SQLITE_BUSY' && i < maxRetries - 1) {
        console.log(`Database busy, retrying (${i+1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
};

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  // Public allowlist: mobile events feed
  const url = req.originalUrl || req.url || '';
  if (req.method === 'GET' && /\/api\/events\/mobile\/events(\?.*)?$/.test(url)) {
    return next();
  }
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Middleware to authorize user roles
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// (moved down) hall-approval mount will be added after authorizePermission definition

// Middleware to check if user has access to specific temple
const authorizeTempleAccess = (req, res, next) => {
  // For master data endpoints, users can only access their own temple
  // The templeId is stored in req.user.templeId from the JWT token
  if (!req.user || !req.user.templeId) {
    return res.status(401).json({ error: 'User not authenticated or temple ID missing' });
  }

  next();
};

// Enhanced authorizePermission middleware with superadmin bypass
const authorizePermission = (permissionId, requiredLevel = 'view') => {
  return async (req, res, next) => {
    // Superadmin bypass
    if (req.user.role === 'superadmin') {
      return next();
    }
    try {
      const permission = await db('user_permissions')
        .where({ 
          user_id: req.user.id, 
          permission_id: permissionId 
        })
        .first();
      
      if (!permission) {
        return res.status(403).json({ error: 'Permission not granted' });
      }
      
      // Check access level hierarchy: view < edit < full
      const accessLevels = { 'view': 1, 'edit': 2, 'full': 3 };
      const userLevel = accessLevels[permission.access_level] || 0;
      const requiredLevelNum = accessLevels[requiredLevel] || 0;
      
      if (userLevel < requiredLevelNum) {
        return res.status(403).json({ error: 'Insufficient permission level' });
      }
      
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

// Now that authorizePermission is defined, mount hall approval routes
const hallApprovalRouter = require('./hall-approval')({ db, authenticateToken, authorizePermission });
app.use('/api/hall-approval', hallApprovalRouter);

// Migrate tables if not exist
async function migrate() {
  console.log('Starting database migration...');
  try {
    // Create temples table
    if (!(await db.schema.hasTable('temples'))) {
      await db.schema.createTable('temples', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.string('address', 200).notNullable();
        table.string('city', 50);
        table.string('state', 50);
        table.string('country', 50).defaultTo('India');
        table.string('postal_code', 20);
        table.string('phone', 20);
        table.string('email', 100);
        table.string('website', 100);
        table.text('description');
        table.decimal('latitude', 9, 6);
        table.decimal('longitude', 9, 6);
        table.string('status', 20).defaultTo('active');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.unique(['name', 'city']);
        table.index(['city', 'state']);
      });
      
      // Create default temples with professional standards
      await db.transaction(async trx => {
        const defaultTemples = [
          { 
            name: 'Main Temple', 
            address: '123 Main Street',
            city: 'Chennai',
            state: 'Tamil Nadu',
            postal_code: '600001',
            phone: '+91 44 12345678', 
            email: 'contact@maintemple.com',
            website: 'https://maintemple.com',
            description: 'Primary temple location with full facilities',
            latitude: 13.0825,
            longitude: 80.2750,
            status: 'active'
          },
          { 
            name: 'Branch Temple', 
            address: '456 Branch Road',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            postal_code: '641001',
            phone: '+91 422 9876543', 
            email: 'info@branchtemple.org',
            website: 'https://branchtemple.org',
            description: 'Secondary temple location with basic facilities',
            latitude: 11.0168,
            longitude: 76.9558,
            status: 'active'
          }
        ];

        for (const temple of defaultTemples) {
          if (!temple.name || !temple.address || !temple.city) {
            throw new Error('Temple name, address and city are required');
          }
          
          await trx('temples').insert({
            name: temple.name.trim(),
            address: temple.address.trim(),
            city: temple.city.trim(),
            state: temple.state?.trim() || null,
            country: temple.country?.trim() || 'India',
            postal_code: temple.postal_code?.trim() || null,
            phone: temple.phone?.trim() || null,
            email: temple.email?.trim() || null,
            website: temple.website?.trim() || null,
            description: temple.description?.trim() || null,
            latitude: temple.latitude || null,
            longitude: temple.longitude || null,
            status: 'active',
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      });
    }

    // Create properties table
    if (!(await db.schema.hasTable('properties'))) {
      await db.schema.createTable('properties', (table) => {
        table.increments('id').primary();
        table.string('property_no').notNullable();
        table.string('survey_no').notNullable();
        table.string('ward_no').notNullable();
        table.string('street_name').notNullable();
        table.string('area').notNullable();
        table.string('city').notNullable();
        table.string('pincode').notNullable();
        table.string('owner_name').notNullable();
        table.string('owner_mobile').notNullable();
        table.string('owner_aadhaar');
        table.text('owner_address');
        table.decimal('tax_amount', 10, 2).notNullable();
        table.integer('tax_year').notNullable();
        table.string('tax_status').defaultTo('pending');
        table.date('last_paid_date');
        table.decimal('pending_amount', 10, 2).notNullable();
        table.integer('created_by').notNullable();
        table.integer('temple_id').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.foreign('temple_id').references('id').inTable('temples').onDelete('CASCADE');
        table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
        
        table.index(['temple_id']);
        table.index(['property_no']);
        table.index(['owner_mobile']);
        table.index(['tax_status']);
      });
      
      // Add property_registrations permission if it doesn't exist
      await db.raw(`
        INSERT OR IGNORE INTO permissions (id, name, description)
        VALUES ('property_registrations', 'Property Registrations', 'Manage property registrations and tax details')
      `);
      
      // Grant full permission to admin role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'admin', 'property_registrations', 'full'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'admin' AND permission_id = 'property_registrations'
        )
      `);
      
      // Grant view permission to member role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'member', 'property_registrations', 'view'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'member' AND permission_id = 'property_registrations'
        )
      `);
    }

    // Create users table with enhanced schema
    if (!(await db.schema.hasTable('users'))) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('mobile').notNullable().unique();
        table.string('username').notNullable();
        table.string('password').notNullable();
        table.string('email');
        table.string('full_name');
        table.string('website_link');
        table.string('profile_image');
        table.string('trust_information');
        table.integer('temple_id').notNullable().references('id').inTable('temples');
        table.string('role').defaultTo('member'); // member, admin, superadmin
        table.string('status').defaultTo('active'); // active, inactive, suspended
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('last_login');
      });
    } else {
      // Check if migration for new fields is needed
      const columns = await db.raw("PRAGMA table_info(users)");
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('temple_id')) {
        console.log('Migrating users table to add temple_id and role fields...');
        
        // Add new columns if they don't exist
        if (!columnNames.includes('temple_id')) {
          await db.raw('ALTER TABLE users ADD COLUMN temple_id INTEGER DEFAULT 1');
        }
        if (!columnNames.includes('role')) {
          await db.raw('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "member"');
        }
        if (!columnNames.includes('status')) {
          await db.raw('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "active"');
        }
        if (!columnNames.includes('last_login')) {
          await db.raw('ALTER TABLE users ADD COLUMN last_login DATETIME');
        }
        
        console.log('Migration completed. Added new fields to users table.');
      }
    }

    // Import and run user_tax_registrations table migration
    const createUserTaxRegistrationsTable = require('./db/migrations/createUserTaxRegistrationsTable');
    await createUserTaxRegistrationsTable(db);

    // Import and run tax_settings table migration
    const createTaxSettingsTable = require('./db/migrations/createTaxSettingsTable');
    await createTaxSettingsTable(db);

    // Import and run migration to add include_previous_years to tax_settings
    const addIncludePreviousYearsToTaxSettings = require('./db/migrations/addIncludePreviousYearsToTaxSettings');
    await addIncludePreviousYearsToTaxSettings(db);

    // Import and run tax settings data seeder
    const seedTaxSettingsData = require('./db/seed/taxSettingsData');
    await seedTaxSettingsData(db);

    // Import dummy data utilities
    const { createDummyTaxRegistrations, createDefaultUsers } = require('./db/seed/dummyData');
    
    // Create default users (superadmin and admin)
    await createDefaultUsers(db, bcrypt);
    
    // Create dummy tax registrations for testing
    await createDummyTaxRegistrations(db);

    // Import and run master table migrations
    const createMasterTables = require('./db/migrations/createMasterTables');
    await createMasterTables(db);

    // Import and run master_people table migration
    const createMasterPeopleTable = require('./db/migrations/createMasterPeopleTable');
    await createMasterPeopleTable(db);

    // Import and run master_groups table migration
    const createMasterGroupsTable = require('./db/migrations/createMasterGroupsTable');
    await createMasterGroupsTable(db);

    // Import and run master_clans table migration
    const createMasterClansTable = require('./db/migrations/createMasterClansTable');
    await createMasterClansTable(db);

    // Import and run master_occupations table migration
    const createMasterOccupationsTable = require('./db/migrations/createMasterOccupationsTable');
    await createMasterOccupationsTable(db);

    // Import and run master_villages table migration
    const createMasterVillagesTable = require('./db/migrations/createMasterVillagesTable');
    await createMasterVillagesTable(db);

    // Import and run master_educations table migration
    const createMasterEducationsTable = require('./db/migrations/createMasterEducationsTable');
    await createMasterEducationsTable(db);

    // Create user_registrations table using the modular migration
    const createUserRegistrationsTable = require('./db/migrations/createUserRegistrationsTable');
    await createUserRegistrationsTable(db);

    // Create user_heirs table (for heirs/family details)
    const createUserHeirsTable = require('./db/migrations/createUserHeirsTable');
    await createUserHeirsTable(db);

    // Create session_logs table
    if (!(await db.schema.hasTable('session_logs'))) {
      await db.schema.createTable('session_logs', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.timestamp('login_time').defaultTo(db.fn.now());
        table.timestamp('logout_time');
        table.string('ip_address').notNullable();
        table.string('user_agent');
        table.integer('duration_seconds');
      });
      console.log('Created session_logs table.');
    }
    
    // Ensure ledger_entries table and add registration_id linkage
    if (!(await db.schema.hasTable('ledger_entries'))) {
      await db.schema.createTable('ledger_entries', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.string('receipt_no').notNullable();
        table.string('date');
        table.string('donor_name').notNullable();
        table.string('village');
        table.string('mobile');
        table.float('amount').notNullable();
        table.float('paid_amount').defaultTo(0);
        table.float('donation_amount').defaultTo(0);
        table.string('year');
        table.string('status').defaultTo('pending');
        table.integer('registration_id'); // link to user_registrations
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created ledger_entries table.');
    } else {
      try {
        const cols = await db.raw("PRAGMA table_info(ledger_entries)");
        const colNames = cols.map(c => c.name);
        if (!colNames.includes('registration_id')) {
          await db.raw('ALTER TABLE ledger_entries ADD COLUMN registration_id INTEGER');
          console.log('Added registration_id to ledger_entries.');
        }
      } catch (e) {
        console.log('Note: Could not alter ledger_entries for registration_id:', e.message);
      }
    }

    // Run SQL migrations from migrations directory
    try {
      const fs = require('fs');
      const migrationsDir = path.join(__dirname, 'migrations');
      
      if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => file.endsWith('.sql'))
          .sort(); // Run migrations in alphabetical order
        
        for (const file of migrationFiles) {
          try {
            const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
              if (statement.trim()) {
                await db.raw(statement);
              }
            }
            console.log(`Migration ${file} completed.`);
          } catch (err) {
            console.log(`Migration ${file} skipped or failed:`, err.message);
          }
        }
      }
    } catch (migrationErr) {
      console.log('SQL migrations skipped:', migrationErr.message);
    }

    // Run enhanced permissions migration
    try {
      const fs = require('fs');
      const migrationSQL = fs.readFileSync(path.join(__dirname, 'enhanced_permissions_migration.sql'), 'utf8');
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await db.raw(statement);
        }
      }
      console.log('Enhanced permissions migration completed.');
    } catch (migrationErr) {
      console.log('Enhanced permissions migration skipped (file not found or already applied):', migrationErr.message);
    }

    // Create marriage_registers table
    if (!(await db.schema.hasTable('marriage_registers'))) {
      await db.schema.createTable('marriage_registers', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.string('register_no');
        table.string('date');
        table.string('time');
        table.string('event'); // ceremony type
        table.string('groom_name');
        table.string('bride_name');
        table.string('address');
        table.string('village');
        table.string('guardian_name');
        table.string('witness_one');
        table.string('witness_two');
        table.string('remarks');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created marriage_registers table.');
    }

    // Create marriage_hall_bookings table
    if (!(await db.schema.hasTable('marriage_hall_bookings'))) {
      await db.schema.createTable('marriage_hall_bookings', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.string('register_no');
        table.string('date');
        table.string('time');
        table.string('event');
        table.string('subdivision');
        table.string('name');
        table.string('address');
        table.string('village');
        table.string('mobile');
        table.string('advance_amount');
        table.string('total_amount');
        table.string('balance_amount');
        table.string('remarks');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created marriage_hall_bookings table.');
    }
    
    // Add approval system fields to marriage_hall_bookings
    try {
      await db.raw("ALTER TABLE marriage_hall_bookings ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))");
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN submitted_by_mobile TEXT');
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN approved_at TIMESTAMP');
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN rejection_reason TEXT');
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN admin_notes TEXT');
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Create hall_approval_logs table
    if (!(await db.schema.hasTable('hall_approval_logs'))) {
      await db.schema.createTable('hall_approval_logs', (table) => {
        table.increments('id').primary();
        table.integer('booking_id').notNullable().references('id').inTable('marriage_hall_bookings').onDelete('CASCADE');
        table.string('action').notNullable();
        table.integer('performed_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('performed_at').defaultTo(db.fn.now());
        table.text('notes');
        table.string('old_status');
        table.string('new_status');
        table.index(['booking_id']);
        table.index(['action']);
      });
      console.log('Created hall_approval_logs table.');
    }

    // Add permissions for hall approval system
    await db.raw(`
      INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
      ('hall_approval', 'Hall Approval', 'Approve or reject hall booking requests from mobile users'),
      ('hall_mobile_submit', 'Hall Mobile Submit', 'Submit hall booking requests from mobile app')
    `);

    // Grant permissions to roles
    await db.raw(`
      INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES
      ('admin', 'hall_approval', 'full'),
      ('superadmin', 'hall_approval', 'full'),
      ('member', 'hall_mobile_submit', 'full')
    `);

    // Create annadhanam table
    if (!(await db.schema.hasTable('annadhanam'))) {
      await db.schema.createTable('annadhanam', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.string('receipt_number').notNullable();
        table.string('name').notNullable();
        table.string('mobile_number').notNullable();
        table.text('food').notNullable();
        table.integer('peoples').notNullable();
        table.string('time').notNullable();
        table.date('from_date').notNullable();
        table.date('to_date').notNullable();
        table.text('remarks');
        table.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.foreign('temple_id').references('id').inTable('temples').onDelete('CASCADE');
        table.index(['temple_id']);
        table.index(['receipt_number']);
        table.index(['name']);
        table.index(['mobile_number']);
        table.index(['from_date']);
        table.index(['to_date']);
      });
      console.log('Created annadhanam table.');
      
      // Add annadhanam_registrations permission if it doesn't exist
      await db.raw(`
        INSERT OR IGNORE INTO permissions (id, name, description)
        VALUES ('annadhanam_registrations', 'Annadhanam Registrations', 'Manage annadhanam registrations and food distribution')
      `);
      
      // Grant full permission to admin role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'admin', 'annadhanam_registrations', 'full'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'admin' AND permission_id = 'annadhanam_registrations'
        )
      `);
      
      // Grant view permission to member role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'member', 'annadhanam_registrations', 'view'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'member' AND permission_id = 'annadhanam_registrations'
        )
      `);
      
      // Grant full permission to superadmin role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'superadmin', 'annadhanam_registrations', 'full'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'superadmin' AND permission_id = 'annadhanam_registrations'
        )
      `);

      // Grant specific permission to user with mobile 9999999999
      await db.raw(`
        INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
        SELECT u.id, 'annadhanam_registrations', 'full'
        FROM users u
        WHERE u.mobile = '9999999999'
        AND NOT EXISTS (
          SELECT 1 FROM user_permissions up
          WHERE up.user_id = u.id AND up.permission_id = 'annadhanam_registrations'
        )
      `);

      // Insert sample test data
      await db.raw(`
        INSERT OR IGNORE INTO annadhanam (temple_id, receipt_number, name, mobile_number, food, peoples, time, from_date, to_date, remarks, created_by, created_at, updated_at) VALUES
        (1, 'ANN001', 'Rajesh Kumar', '9876543210', 'Breakfast', 10, '08:00', '2024-01-15', '2024-01-15', 'Morning Annadhanam', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN002', 'Priya Sharma', '9876543211', 'Lunch', 20, '12:00', '2024-01-16', '2024-01-16', 'Afternoon Annadhanam', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN003', 'Suresh Reddy', '9876543212', 'Dinner', 30, '18:00', '2024-01-17', '2024-01-17', 'Evening Annadhanam', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN004', 'Meera Patel', '9876543213', 'Breakfast', 40, '08:00', '2024-01-18', '2024-01-20', '3-day Annadhanam', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN005', 'Kumar Singh', '9876543214', 'Lunch', 50, '12:00', '2024-01-19', '2024-01-19', 'Special Annadhanam', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN006', 'Anita Desai', '9876543215', 'Dinner', 60, '18:00', '2024-01-20', '2024-01-20', 'Annadhanam for guests', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN007', 'Vikram Joshi', '9876543216', 'Breakfast', 70, '08:00', '2024-01-21', '2024-01-21', 'Annadhanam for devotees', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN008', 'Sunita Agarwal', '9876543217', 'Lunch', 80, '12:00', '2024-01-22', '2024-01-22', 'Annadhanam for visitors', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN009', 'Ramesh Gupta', '9876543218', 'Dinner', 90, '18:00', '2024-01-23', '2024-01-23', 'Annadhanam for staff', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'ANN010', 'Lakshmi Iyer', '9876543219', 'Breakfast', 100, '08:00', '2024-01-24', '2024-01-26', '3-day Annadhanam for all', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
    }

    // Add approval system fields to annadhanam table
    try {
      await db.raw(`ALTER TABLE annadhanam ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE annadhanam ADD COLUMN submitted_by_mobile TEXT`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE annadhanam ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE annadhanam ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE annadhanam ADD COLUMN approved_at TIMESTAMP`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE annadhanam ADD COLUMN rejection_reason TEXT`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE annadhanam ADD COLUMN admin_notes TEXT`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Create annadhanam_approval_logs table
    if (!(await db.schema.hasTable('annadhanam_approval_logs'))) {
      await db.schema.createTable('annadhanam_approval_logs', (table) => {
        table.increments('id').primary();
        table.integer('annadhanam_id').notNullable().references('id').inTable('annadhanam').onDelete('CASCADE');
        table.string('action').notNullable();
        table.integer('performed_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('performed_at').defaultTo(db.fn.now());
        table.text('notes');
        table.string('old_status');
        table.string('new_status');
        table.index(['annadhanam_id']);
        table.index(['action']);
      });
      console.log('Created annadhanam_approval_logs table.');
    }

    // Ensure annadhanam table has mobile workflow fields
    try { await db.raw("ALTER TABLE annadhanam ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','cancelled'))"); } catch (e) {}
    try { await db.raw('ALTER TABLE annadhanam ADD COLUMN submitted_by_mobile TEXT'); } catch (e) {}
    try { await db.raw('ALTER TABLE annadhanam ADD COLUMN submitted_at TIMESTAMP'); } catch (e) {}
    try { await db.raw('ALTER TABLE annadhanam ADD COLUMN approved_at TIMESTAMP'); } catch (e) {}
    try { await db.raw('ALTER TABLE annadhanam ADD COLUMN rejection_reason TEXT'); } catch (e) {}
    try { await db.raw('ALTER TABLE annadhanam ADD COLUMN admin_notes TEXT'); } catch (e) {}

    // Create donations table
    if (!(await db.schema.hasTable('donations'))) {
      await db.schema.createTable('donations', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.string('product_name').notNullable();
        table.text('description');
        table.decimal('price', 10, 2).notNullable();
        table.integer('quantity').defaultTo(1);
        table.string('category');
        table.string('donor_name');
        table.string('donor_contact');
        table.date('donation_date');
        table.string('status').defaultTo('available');
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.foreign('temple_id').references('id').inTable('temples').onDelete('CASCADE');
        table.index(['temple_id']);
        table.index(['product_name']);
        table.index(['category']);
      });
      console.log('Created donations table.');
    }
    try { await db.raw("ALTER TABLE donations ADD COLUMN approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending','approved','rejected','cancelled'))"); } catch (e) {}
    try { await db.raw('ALTER TABLE donations ADD COLUMN submitted_by_mobile TEXT'); } catch (e) {}
    try { await db.raw('ALTER TABLE donations ADD COLUMN submitted_at TIMESTAMP'); } catch (e) {}
    try { await db.raw('ALTER TABLE donations ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL'); } catch (e) {}
    try { await db.raw('ALTER TABLE donations ADD COLUMN approved_at TIMESTAMP'); } catch (e) {}
    try { await db.raw('ALTER TABLE donations ADD COLUMN rejection_reason TEXT'); } catch (e) {}
    try { await db.raw('ALTER TABLE donations ADD COLUMN admin_notes TEXT'); } catch (e) {}

    // Create donations_approval_logs table
    if (!(await db.schema.hasTable('donations_approval_logs'))) {
      await db.schema.createTable('donations_approval_logs', (table) => {
        table.increments('id').primary();
        table.integer('donation_id').notNullable().references('id').inTable('donations').onDelete('CASCADE');
        table.string('action').notNullable();
        table.integer('performed_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('performed_at').defaultTo(db.fn.now());
        table.text('notes');
        table.string('old_status');
        table.string('new_status');
        table.index(['donation_id']);
        table.index(['action']);
      });
      console.log('Created donations_approval_logs table.');
    }

    // Seed permissions for donations approval system
    await db.raw(`
      INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
      ('donation_approval', 'Donation Approval', 'Approve or reject donation requests'),
      ('donation_mobile_submit', 'Donation Mobile Submit', 'Submit donation requests from mobile app')
    `);

    // Grant permissions to roles
    await db.raw(`
      INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES
      ('admin', 'donation_approval', 'full'),
      ('superadmin', 'donation_approval', 'full'),
      ('member', 'donation_mobile_submit', 'full')
    `);

    // Create pooja table
    if (!(await db.schema.hasTable('pooja'))) {
      await db.schema.createTable('pooja', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.string('receipt_number').notNullable();
        table.string('name').notNullable();
        table.string('mobile_number').notNullable();
        table.string('time').notNullable();
        table.date('from_date').notNullable();
        table.date('to_date').notNullable();
        table.text('remarks');
        table.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.foreign('temple_id').references('id').inTable('temples').onDelete('CASCADE');
        table.index(['temple_id']);
        table.index(['receipt_number']);
        table.index(['name']);
        table.index(['mobile_number']);
        table.index(['from_date']);
        table.index(['to_date']);
      });
      console.log('Created pooja table.');
      
      // Add pooja_registrations permission if it doesn't exist
      await db.raw(`
        INSERT OR IGNORE INTO permissions (id, name, description)
        VALUES ('pooja_registrations', 'Pooja Registrations', 'Manage pooja registrations and religious ceremonies')
      `);
      
      // Grant full permission to admin role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'admin', 'pooja_registrations', 'full'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'admin' AND permission_id = 'pooja_registrations'
        )
      `);
      
      // Grant view permission to member role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'member', 'pooja_registrations', 'view'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'member' AND permission_id = 'pooja_registrations'
        )
      `);
      
      // Grant full permission to superadmin role
      await db.raw(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
        SELECT 'superadmin', 'pooja_registrations', 'full'
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = 'superadmin' AND permission_id = 'pooja_registrations'
        )
      `);

      // Grant specific permission to user with mobile 9999999999
      await db.raw(`
        INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
        SELECT u.id, 'pooja_registrations', 'full'
        FROM users u
        WHERE u.mobile = '9999999999'
        AND NOT EXISTS (
          SELECT 1 FROM user_permissions up
          WHERE up.user_id = u.id AND up.permission_id = 'pooja_registrations'
        )
      `);

      // Insert sample test data
      await db.raw(`
        INSERT OR IGNORE INTO pooja (temple_id, receipt_number, name, mobile_number, time, from_date, to_date, remarks, created_by, created_at, updated_at) VALUES
        (1, 'POO001', 'Rajesh Kumar', '9876543210', '06:00', '2024-01-15', '2024-01-15', 'Morning Ganapathy Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO002', 'Priya Sharma', '9876543211', '18:00', '2024-01-16', '2024-01-16', 'Evening Lakshmi Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO003', 'Suresh Reddy', '9876543212', '12:00', '2024-01-17', '2024-01-17', 'Noon Shiva Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO004', 'Meera Patel', '9876543213', '08:00', '2024-01-18', '2024-01-20', '3-day Navagraha Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO005', 'Kumar Singh', '9876543214', '19:00', '2024-01-19', '2024-01-19', 'Evening Durga Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO006', 'Anita Desai', '9876543215', '07:30', '2024-01-20', '2024-01-20', 'Morning Saraswati Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO007', 'Vikram Joshi', '9876543216', '17:30', '2024-01-21', '2024-01-21', 'Evening Hanuman Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO008', 'Sunita Agarwal', '9876543217', '11:00', '2024-01-22', '2024-01-22', 'Morning Venkateswara Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO009', 'Ramesh Gupta', '9876543218', '20:00', '2024-01-23', '2024-01-23', 'Night Kali Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 'POO010', 'Lakshmi Iyer', '9876543219', '09:00', '2024-01-24', '2024-01-26', '3-day Maha Lakshmi Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
    }

    // Add approval system fields to pooja table
    try {
      await db.raw(`ALTER TABLE pooja ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE pooja ADD COLUMN submitted_by_mobile TEXT`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE pooja ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE pooja ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE pooja ADD COLUMN approved_at TIMESTAMP`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE pooja ADD COLUMN rejection_reason TEXT`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    try {
      await db.raw(`ALTER TABLE pooja ADD COLUMN admin_notes TEXT`);
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Create pooja_approval_logs table
    if (!(await db.schema.hasTable('pooja_approval_logs'))) {
      await db.schema.createTable('pooja_approval_logs', (table) => {
        table.increments('id').primary();
        table.integer('pooja_id').notNullable().references('id').inTable('pooja').onDelete('CASCADE');
        table.string('action').notNullable();
        table.integer('performed_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('performed_at').defaultTo(db.fn.now());
        table.text('notes');
        table.string('old_status');
        table.string('new_status');
        
        table.index(['pooja_id']);
        table.index(['action']);
      });
      console.log('Created pooja_approval_logs table.');
    }

    // Add permissions for pooja approval system
    await db.raw(`
      INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
      ('pooja_approval', 'Pooja Approval', 'Approve or reject pooja requests from mobile users'),
      ('pooja_mobile_submit', 'Pooja Mobile Submit', 'Submit pooja requests from mobile app')
    `);

    // Grant permissions to roles
    await db.raw(`
      INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES
      ('admin', 'pooja_approval', 'full'),
      ('superadmin', 'pooja_approval', 'full'),
      ('member', 'pooja_mobile_submit', 'full')
    `);

    // Grant specific permission to user with mobile 9999999999
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

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
}

console.log('Starting migration...');
// Skip automatic migrations
// await db.migrate.latest();
migrate().then(() => {
  console.log('Migration completed, starting server...');
}).catch(err => {
  console.error('Migration failed:', err);
  console.log('Continuing with server startup...');
});

// Mount users router
const usersRouter = require('./users')({ db, JWT_SECRET });
app.use('/api', usersRouter);

// Mobile routes already mounted at the top

// Get all temples (for temple selection)
app.get('/api/temples', async (req, res) => {
  try {
    const temples = await db('temples').select('*').orderBy('name');
    res.json({ success: true, temples });
  } catch (err) {
    console.error('Error fetching temples:', err);
    res.status(500).json({ error: 'Database error while fetching temples.' });
  }
});

// Get available permissions (for admin interface)
app.get('/api/permissions', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const permissions = [
      { id: 'member_entry', label: 'Member Entry', description: 'Add, edit, and manage member registrations' },
      { id: 'member_view', label: 'Member View', description: 'View member list and details' },
      { id: 'master_data', label: 'Master Data', description: 'Manage groups, clans, occupations, villages, educations' },
      { id: 'ledger_management', label: 'Ledger Management', description: 'Manage financial records and transactions' },
      { id: 'session_logs', label: 'Session Logs', description: 'View user login/logout activities' },
      { id: 'activity_logs', label: 'Activity Logs', description: 'View system activity and audit logs' },
      { id: 'user_management', label: 'User Management', description: 'Create and manage user accounts' },
      { id: 'temple_settings', label: 'Temple Settings', description: 'Manage temple configuration and settings' },
      { id: 'reports', label: 'Reports', description: 'Generate and view system reports' },
      { id: 'backup_restore', label: 'Backup & Restore', description: 'Database backup and restore operations' },
      { id: 'user_registrations', label: 'User Registrations', description: 'Manage temple user registrations and related payments' },
      { id: 'tax_registrations', label: 'Tax Registrations', description: 'Manage temple tax registrations (separate module)' },
    ];
    res.json({ success: true, permissions });
  } catch (err) {
    console.error('Error fetching permissions:', err);
    res.status(500).json({ error: 'Database error while fetching permissions.' });
  }
});

// Endpoint to save Master Record (authenticated users)
app.post('/api/master-records', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { 
    templeId, 
    date, 
    name, 
    under, 
    openingBalance, 
    balanceType, 
    address, 
    village, 
    telephone, 
    mobile, 
    email, 
    note 
  } = req.body;

  if (!templeId || !date || !name || !under) {
    return res.status(400).json({ error: 'Temple ID, date, name, and under fields are required.' });
  }

  try {
    const newRecord = await retryOnBusy(() => db('master_records').insert({
      temple_id: templeId,
      date,
      name,
      under,
      opening_balance: openingBalance || '0',
      balance_type: balanceType || 'credit',
      address_line1: address && address[0] ? address[0] : '',
      address_line2: address && address[1] ? address[1] : '',
      address_line3: address && address[2] ? address[2] : '',
      address_line4: address && address[3] ? address[3] : '',
      village: village || '',
      telephone: telephone || '',
      mobile: mobile || '',
      email: email || '',
      note: note || ''
    }).returning('*'));

    console.log('Successfully saved master record:', newRecord);
    res.json({ success: true, record: newRecord });
  } catch (err) {
    console.error('Error saving master record - Full error:', err);
    res.status(500).json({ error: 'Database error while saving master record.', details: err.message });
  }
});

// Endpoint to fetch Master Records for a specific temple (authenticated users)
app.get('/api/master-records/:templeId', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { templeId } = req.params;

  try {
    const records = await db('master_records')
      .where('temple_id', templeId)
      .select('*');
    res.json({ success: true, records: records });
  } catch (err) {
    console.error('Error fetching master records:', err);
    res.status(500).json({ error: 'Database error while fetching master records.' });
  }
});

// Mount master data routes
const masterDataRouter = require('./components/master-data')({ db, retryOnBusy });
app.use('/api/master', masterDataRouter);

// Master clans delete route has been moved to /api/master/clans/:id

// Master Occupations endpoints
app.post('/api/master-occupations', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Occupation name is required.' });
  }

  try {
    const newOccupation = await retryOnBusy(() => db('master_occupations').insert({
      temple_id: templeId,
      name: name.trim(),
      description: description || '',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));
    
    console.log('Successfully saved master occupation:', newOccupation);
    res.status(201).json({ success: true, id: newOccupation[0] });
  } catch (err) {
    console.error('Error saving master occupation:', err);
    res.status(500).json({ error: 'Database error while saving master occupation.' });
  }
});

app.get('/api/master-occupations/:templeId', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { templeId } = req.params;

  try {
    const occupations = await db('master_occupations')
      .where('temple_id', templeId)
      .orderBy('name', 'asc');
    
    res.json(occupations);
  } catch (err) {
    console.error('Error fetching master occupations:', err);
    res.status(500).json({ error: 'Database error while fetching master occupation.' });
  }
});

// PUT endpoint for updating master occupations
app.put('/api/master-occupations/:id', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Occupation name is required.' });
  }

  try {
    // Check if occupation exists and belongs to user's temple
    const existingOccupation = await db('master_occupations')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingOccupation) {
      return res.status(404).json({ error: 'Occupation not found or access denied.' });
    }

    await db('master_occupations')
      .where({ id, temple_id: templeId })
      .update({
        name: name.trim(),
        description: description || '',
        updated_at: db.fn.now()
      });

    res.json({ success: true, message: 'Occupation updated successfully.' });
  } catch (err) {
    console.error('Error updating master occupation:', err);
    res.status(500).json({ error: 'Database error while updating master occupation.' });
  }
});

// DELETE endpoint for deleting master occupations
app.delete('/api/master-occupations/:id', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    // Check if occupation exists and belongs to user's temple
    const existingOccupation = await db('master_occupations')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingOccupation) {
      return res.status(404).json({ error: 'Occupation not found or access denied.' });
    }

    // Check if occupation is being used by any users
    const usersWithOccupation = await db('user_registrations')
      .where({ occupation: existingOccupation.name, temple_id: templeId })
      .first();

    if (usersWithOccupation) {
      return res.status(400).json({ 
        error: 'Cannot delete occupation. It is currently being used by registered users.' 
      });
    }

    await db('master_occupations')
      .where({ id, temple_id: templeId })
      .del();

    res.json({ success: true, message: 'Occupation deleted successfully.' });
  } catch (err) {
    console.error('Error deleting master occupation:', err);
    res.status(500).json({ error: 'Database error while deleting master occupation.' });
  }
});

// Master Villages endpoints
app.post('/api/master-villages', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Village name is required.' });
  }

  try {
    const newVillage = await retryOnBusy(() => db('master_villages').insert({
      temple_id: templeId,
      name: name.trim(),
      description: description || '',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));
    
    console.log('Successfully saved master village:', newVillage);
    res.status(201).json({ success: true, id: newVillage[0] });
  } catch (err) {
    console.error('Error saving master village:', err);
    res.status(500).json({ error: 'Database error while saving master village.' });
  }
});

app.get('/api/master-villages/:templeId', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { templeId } = req.params;

  try {
    const villages = await db('master_villages')
      .where('temple_id', templeId)
      .orderBy('name', 'asc');
    
    res.json(villages);
  } catch (err) {
    console.error('Error fetching master villages:', err);
    res.status(500).json({ error: 'Database error while fetching master villages.' });
  }
});

// PUT endpoint for updating master villages
app.put('/api/master-villages/:id', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Village name is required.' });
  }

  try {
    // Check if village exists and belongs to user's temple
    const existingVillage = await db('master_villages')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingVillage) {
      return res.status(404).json({ error: 'Village not found or access denied.' });
    }

    await db('master_villages')
      .where({ id, temple_id: templeId })
      .update({
        name: name.trim(),
        description: description || '',
        updated_at: db.fn.now()
      });

    res.json({ success: true, message: 'Village updated successfully.' });
  } catch (err) {
    console.error('Error updating master village:', err);
    res.status(500).json({ error: 'Database error while updating master village.' });
  }
});

// DELETE endpoint for deleting master villages
app.delete('/api/master-villages/:id', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    // Check if village exists and belongs to user's temple
    const existingVillage = await db('master_villages')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingVillage) {
      return res.status(404).json({ error: 'Village not found or access denied.' });
    }

    // Check if village is being used by any users
    const usersWithVillage = await db('user_registrations')
      .where({ village: existingVillage.name, temple_id: templeId })
      .first();

    if (usersWithVillage) {
      return res.status(400).json({ 
        error: 'Cannot delete village. It is currently being used by registered users.' 
      });
    }

    await db('master_villages')
      .where({ id, temple_id: templeId })
      .del();

    res.json({ success: true, message: 'Village deleted successfully.' });
  } catch (err) {
    console.error('Error deleting master village:', err);
    res.status(500).json({ error: 'Database error while deleting master village.' });
  }
});

// Master Educations endpoints
app.post('/api/master-educations', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Education name is required.' });
  }

  try {
    const newEducation = await retryOnBusy(() => db('master_educations').insert({
      temple_id: templeId,
      name: name.trim(),
      description: description || '',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));
    
    console.log('Successfully saved master education:', newEducation);
    res.status(201).json({ success: true, id: newEducation[0] });
  } catch (err) {
    console.error('Error saving master education:', err);
    res.status(500).json({ error: 'Database error while saving master education.' });
  }
});

app.get('/api/master-educations/:templeId', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { templeId } = req.params;

  try {
    const educations = await db('master_educations')
      .where('temple_id', templeId)
      .orderBy('name', 'asc');
    
    res.json(educations);
  } catch (err) {
    console.error('Error fetching master educations:', err);
    res.status(500).json({ error: 'Database error while fetching master educations.' });
  }
});

// PUT endpoint for updating master educations
app.put('/api/master-educations/:id', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Education name is required.' });
  }

  try {
    // Check if education exists and belongs to user's temple
    const existingEducation = await db('master_educations')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingEducation) {
      return res.status(404).json({ error: 'Education not found or access denied.' });
    }

    await db('master_educations')
      .where({ id, temple_id: templeId })
      .update({
        name: name.trim(),
        description: description || '',
        updated_at: db.fn.now()
      });

    res.json({ success: true, message: 'Education updated successfully.' });
  } catch (err) {
    console.error('Error updating master education:', err);
    res.status(500).json({ error: 'Database error while updating master education.' });
  }
});

// DELETE endpoint for deleting master educations
app.delete('/api/master-educations/:id', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    // Check if education exists and belongs to user's temple
    const existingEducation = await db('master_educations')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingEducation) {
      return res.status(404).json({ error: 'Education not found or access denied.' });
    }

    // Check if education is being used by any users
    const usersWithEducation = await db('user_registrations')
      .where({ education: existingEducation.name, temple_id: templeId })
      .first();

    if (usersWithEducation) {
      return res.status(400).json({ 
        error: 'Cannot delete education. It is currently being used by registered users.' 
      });
    }

    await db('master_educations')
      .where({ id, temple_id: templeId })
      .del();

    res.json({ success: true, message: 'Education deleted successfully.' });
  } catch (err) {
    console.error('Error deleting master education:', err);
    res.status(500).json({ error: 'Database error while deleting master education.' });
  }
});

// Users endpoints
app.post('/api/users', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const {
    referenceNumber,
    date,
    subdivision,
    name,
    alternativeName,
    wifeName,
    education,
    occupation,
    fatherName,
    address,
    birthDate,
    village,
    mobileNumber,
    aadhaarNumber,
    panNumber,
    clan,
    group,
    postalCode,
    maleHeirs,
    femaleHeirs,
    heirs,
    templeId
  } = req.body;

  if (!name || !aadhaarNumber || !templeId) {
    return res.status(400).json({ error: 'Name, Aadhaar number, and temple ID are required.' });
  }

  try {
          const newUser = await retryOnBusy(() => db('user_registrations').insert({
      reference_number: referenceNumber || '',
      date: date || new Date().toISOString().slice(0, 10),
      subdivision: subdivision || '',
      name: name.trim(),
      alternative_name: alternativeName || '',
      wife_name: wifeName || '',
      education: education || '',
      occupation: occupation || '',
      father_name: fatherName || '',
      address: address || '',
      birth_date: birthDate || '',
      village: village || '',
      mobile_number: mobileNumber || '',
      aadhaar_number: aadhaarNumber,
      pan_number: panNumber || '',
      clan: clan || '',
      group: group || '',
      postal_code: postalCode || '',
      male_heirs: maleHeirs || 0,
      female_heirs: femaleHeirs || 0,
      temple_id: templeId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));

    console.log('Successfully saved user:', newUser);
    res.status(201).json({ success: true, id: newUser[0] });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Database error while saving user.' });
  }
});

// Ledger endpoints
app.post('/api/ledger', authenticateToken, authorizePermission('ledger_management', 'edit'), async (req, res) => {
  const {
    receipt_no,
    date,
    donor_name,
    village,
    mobile,
    amount,
    paid_amount,
    donation_amount,
    year,
    templeId
  } = req.body;

  if (!receipt_no || !donor_name || !amount || !templeId) {
    return res.status(400).json({ error: 'Receipt number, donor name, amount, and temple ID are required.' });
  }

  try {
    const newEntry = await db('ledger_entries').insert({
      receipt_no: receipt_no.trim(),
      date: date || new Date().toISOString().split('T')[0],
      donor_name: donor_name.trim(),
      village: village || '',
      mobile: mobile || '',
      amount: parseFloat(amount),
      paid_amount: parseFloat(paid_amount) || 0,
      donation_amount: parseFloat(donation_amount) || 0,
      year: year || new Date().getFullYear().toString(),
      status: parseFloat(paid_amount) >= parseFloat(amount) ? 'paid' : 'pending',
      temple_id: templeId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    console.log('Successfully saved ledger entry:', newEntry);
    res.status(201).json({ success: true, id: newEntry[0] });
  } catch (err) {
    console.error('Error saving ledger entry:', err);
    res.status(500).json({ error: 'Database error while saving ledger entry.' });
  }
});

app.get('/api/ledger/:templeId', authenticateToken, authorizePermission('ledger_management', 'view'), async (req, res) => {
  const { templeId } = req.params;

  try {
    const entries = await db('ledger_entries')
      .where({ temple_id: templeId })
      .orderBy('created_at', 'desc');

    res.json(entries);
  } catch (err) {
    console.error('Error fetching ledger entries:', err);
    res.status(500).json({ error: 'Database error while fetching ledger entries.' });
  }
});

app.put('/api/ledger/:id', authenticateToken, authorizePermission('ledger_management', 'edit'), async (req, res) => {
  const { id } = req.params;
  const {
    receipt_no,
    date,
    donor_name,
    village,
    mobile,
    amount,
    paid_amount,
    donation_amount,
    year
  } = req.body;
  const templeId = req.user.templeId;

  if (!receipt_no || !donor_name || !amount) {
    return res.status(400).json({ error: 'Receipt number, donor name, and amount are required.' });
  }

  try {
    // Check if entry exists and belongs to user's temple
    const existingEntry = await db('ledger_entries')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingEntry) {
      return res.status(404).json({ error: 'Ledger entry not found or access denied.' });
    }

    const status = parseFloat(paid_amount) >= parseFloat(amount) ? 'paid' : 'pending';

    await db('ledger_entries')
      .where({ id, temple_id: templeId })
      .update({
        receipt_no: receipt_no.trim(),
        date: date,
        donor_name: donor_name.trim(),
        village: village || '',
        mobile: mobile || '',
        amount: parseFloat(amount),
        paid_amount: parseFloat(paid_amount) || 0,
        donation_amount: parseFloat(donation_amount) || 0,
        year: year || new Date().getFullYear().toString(),
        status: status,
        updated_at: db.fn.now()
      });

    res.json({ success: true, message: 'Ledger entry updated successfully.' });
  } catch (err) {
    console.error('Error updating ledger entry:', err);
    res.status(500).json({ error: 'Database error while updating ledger entry.' });
  }
});

app.delete('/api/ledger/:id', authenticateToken, authorizePermission('ledger_management', 'full'), async (req, res) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    // Check if entry exists and belongs to user's temple
    const existingEntry = await db('ledger_entries')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingEntry) {
      return res.status(404).json({ error: 'Ledger entry not found or access denied.' });
    }

    await db('ledger_entries')
      .where({ id, temple_id: templeId })
      .del();

    res.json({ success: true, message: 'Ledger entry deleted successfully.' });
  } catch (err) {
    console.error('Error deleting ledger entry:', err);
    res.status(500).json({ error: 'Database error while deleting ledger entry.' });
  }
});

// ---------------- Temple User Registrations (separate from Members) ----------------
// Helper: generate receipt number REG-{templeId}-{YYYYMMDD}-{sequence}
async function generateRegistrationReceipt(db, templeId, dateStr) {
  const today = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countRow = await db('ledger_entries')
    .where({ temple_id: templeId })
    .andWhere('date', new Date().toISOString().slice(0, 10))
    .count({ c: '*' })
    .first();
  const seq = String((countRow?.c || 0) + 1).padStart(4, '0');
  return `REG-${templeId}-${today}-${seq}`;
}

// Registration routes are now handled in server/routes/registrations.js
// Registrations bulk PDF export route moved to module 'server/registrations.js'

// Registration create/update/delete/payment routes moved to module 'server/registrations.js'

// Member registration endpoint with pure permission check
app.post('/api/members', 
  authenticateToken, 
  authorizePermission('member_entry', 'full'), 
  async (req, res) => {
    try {
      console.log('Member creation request body:', req.body);
      console.log('User info:', req.user);
      
      const { name, username, mobile, email, createLogin, password, permissionLevel, customPermissions, role } = req.body;
      
      if (!name || !mobile) {
        return res.status(400).json({ error: 'Name and mobile are required' });
      }
      
      // Check if username is provided when createLogin is true
      if (createLogin && !username) {
        return res.status(400).json({ error: 'Username is required when creating login' });
      }
      
      // Check if username already exists when creating login
      if (createLogin && username) {
        const existingUser = await db('users').where({ username }).first();
        if (existingUser) {
          return res.status(409).json({ error: 'Username already exists' });
        }
      }
      
      const newMember = await db.transaction(async trx => {
        console.log('Creating member record with data:', {
          name,
          username,
          mobile_number: mobile,
          email,
          temple_id: req.user.templeId
        });
        
        // Create member record
        const [member] = await trx('user_registrations')
          .insert({
            name,
            username,
            mobile_number: mobile,
            email,
            temple_id: req.user.templeId,
            created_at: db.fn.now()
          })
          .returning('*');
        
        // Create login if requested
        if (createLogin) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const [createdUser] = await trx('users')
            .insert({
              username,
              full_name: name,
              mobile,
              email,
              password: hashedPassword,
              temple_id: req.user.templeId,
              role: mobile === '9999999999' ? 'superadmin' : role || 'member'
            })
            .returning('*');
          
          // Assign provided custom permissions to the newly created user
          if (mobile === '9999999999') {
            // Grant all permissions for superadmin mobile
            const allPerms = await trx('permissions').select('id');
            const superPerms = allPerms.map(p => ({
              user_id: createdUser.id,
              permission_id: p.id,
              access_level: 'full'
            }));
            await trx('user_permissions').insert(superPerms);
          } else if (customPermissions && Array.isArray(customPermissions)) {
            const permissionRecords = customPermissions.map(perm => ({
              user_id: createdUser.id,
              permission_id: perm.id,
              access_level: perm.access
            }));
            await trx('user_permissions').insert(permissionRecords);
          } else if (permissionLevel) {
            // Backward compatibility: if only a single permission level is provided, set it for member_entry
            await trx('user_permissions').insert({
              user_id: createdUser.id,
              permission_id: 'member_entry',
              access_level: permissionLevel,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });
          }
        }
        
        return member;
      });

      res.json({ success: true, member: newMember });
    } catch (err) {
      console.error('Member registration error:', err);
      console.error('Error details:', err.message);
      console.error('Error stack:', err.stack);
      res.status(500).json({ error: 'Error registering member', details: err.message });
    }
});

// Superadmin endpoint: grant all permissions to a user by mobile
app.post('/api/admin/grant-all-permissions', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile is required' });
    }

    const userRec = await db('users').where({ mobile }).first();
    if (!userRec) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Define all permission IDs used in the app
    const ALL_PERMISSION_IDS = [
      'member_entry',
      'master_data',
      'balance_sheet',
      'transaction',
      'report',
      'setting'
    ];

    // Upsert permissions to 'full'
    for (const pid of ALL_PERMISSION_IDS) {
      const existing = await db('user_permissions')
        .where({ user_id: userRec.id, permission_id: pid })
        .first();

      if (existing) {
        await db('user_permissions')
          .where({ user_id: userRec.id, permission_id: pid })
          .update({ access_level: 'full', updated_at: db.fn.now() });
      } else {
        await db('user_permissions').insert({
          user_id: userRec.id,
          permission_id: pid,
          access_level: 'full',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    const updated = await db('user_permissions')
      .where({ user_id: userRec.id })
      .select('permission_id', 'access_level');

    res.json({ success: true, userId: userRec.id, permissions: updated });
  } catch (err) {
    console.error('Grant-all-permissions error:', err);
    res.status(500).json({ error: 'Failed to grant permissions' });
  }
});

// Member list endpoint with pure permission check
app.get('/api/members', 
  authenticateToken, 
  authorizePermission('member_view', 'view'), 
  async (req, res) => {
    try {
      const members = await db('user_registrations')
        .join('users', 'user_registrations.mobile_number', 'users.mobile')
        .where('user_registrations.temple_id', req.user.templeId)
        .select('user_registrations.*', 'users.id as userId', 'users.status as is_blocked');
      
      res.json({ success: true, members });
    } catch (err) {
      console.error('Member list error:', err);
      res.status(500).json({ error: 'Error fetching members' });
    }
  }
);

// Session management endpoints
app.get('/api/sessions', authenticateToken, authorizePermission('session_logs', 'view'), async (req, res) => {
  try {
    const sessions = await db('sessions')
      .where('user_id', req.user.id)
      .orderBy('last_activity', 'desc');
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.get('/api/admin/sessions', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const sessions = await db('sessions')
      .join('users', 'sessions.user_id', 'users.id')
      .select('sessions.*', 'users.full_name', 'users.mobile')
      .orderBy('last_activity', 'desc')
      .limit(100);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.get('/api/activity-logs', authenticateToken, authorizePermission('activity_logs', 'view'), async (req, res) => {
  try {
    const logs = await db('activity_logs')
      .where('actor_user_id', req.user.id)
      .orderBy('created_at', 'desc')
      .limit(200);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// =======================
// TAX SETTINGS ENDPOINTS
// =======================

// Import tax settings routes
const taxSettingsRouter = require('./routes/tax-settings');

// Mount tax settings routes with middleware
app.use('/api/tax-settings', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'),
  (req, res, next) => {
    // Add db to the request object
    req.db = db;
    next();
  },
  taxSettingsRouter
);

// Import tax calculations routes
const taxCalculationsRouter = require('./routes/tax-calculations');

// Mount tax calculations routes with middleware - make it more specific
app.use('/api', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'),
  (req, res, next) => {
    // Add db to the request object
    req.db = db;
    next();
  },
  taxCalculationsRouter
);

app.get('/', async (req, res) => {
  res.json("Temple Management API is running");
});

// Import auth routes
const authRouter = require('./routes/auth');

// Mount auth routes with middleware - make it more specific
app.use('/api/auth', 
  authenticateToken,
  (req, res, next) => {
    // Add db to the request object
    req.db = db;
    next();
  },
  authRouter
);

// Add this middleware after auth middleware
// Kanikalar (Wedding) Module Endpoints

// Import wedding events routes
const weddingEventsRouter = require('./routes/wedding-events');

// Mount wedding events routes with middleware
app.use('/api/wedding-events',
  authenticateToken,
  (req, res, next) => {
    // Add db to the request object
    req.db = db;
    next();
  },
  weddingEventsRouter
);

// Import events routes
const eventsRouter = require('./routes/events');

// Mount events routes with middleware
app.use('/api/events',
  authenticateToken,
  (req, res, next) => {
    req.db = db;
    next();
  },
  eventsRouter
);

app.use((req, res, next) => {
  if (req.user?.mobile === '9999999999') {
    console.log(`[SUPERADMIN ACTION] ${req.method} ${req.path}`);
    
    // Log to database
    db('superadmin_logs').insert({
      user_id: req.user.id,
      action: `${req.method} ${req.path}`,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: db.fn.now()
    }).catch(console.error);
  }
  next();
});

// Mount mobile events routes
app.use('/api/mobile/events',
  (req, res, next) => {
    req.db = db;
    next();
  },
  eventsRouter
);

app.get('/api/superadmin-logs', authenticateToken, (req, res) => {
  if (req.user.mobile !== '9999999999') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  db('superadmin_logs')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .then(logs => res.json(logs))
    .catch(err => {
      console.error('Failed to fetch superadmin logs:', err);
      res.status(500).json({ error: 'Database error' });
    });
});

// session_logs table is created during migrate()

// Add endpoint to get session logs
app.get('/api/session-logs', authenticateToken, authorizePermission('session_logs', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const totalCount = await db('session_logs').count('* as count').first();
    
    const logs = await db('session_logs')
      .orderBy('login_time', 'desc')
      .limit(limit)
      .offset(offset);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount.count / limit),
        totalItems: totalCount.count,
        itemsPerPage: limit
      }
    });
  } catch (err) {
    console.error('Error fetching session logs:', err);
    res.status(500).json({ error: 'Failed to fetch session logs' });
  }
});

// Session logs export endpoint (JSON/CSV)
app.get('/api/session-logs/export', authenticateToken, authorizePermission('session_logs', 'view'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = db('session_logs').orderBy('login_time', 'desc');
    
    if (startDate) {
      query = query.where('login_time', '>=', new Date(startDate));
    }
    
    if (endDate) {
      query = query.where('login_time', '<=', new Date(endDate));
    }
    
    const logs = await query;
    
    // Calculate statistics
    const totalSessions = logs.length;
    const activeSessions = logs.filter(log => !log.logout_time).length;
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    
    res.json({
      success: true,
      data: logs,
      stats: {
        totalSessions,
        activeSessions,
        avgDuration,
        totalDuration
      }
    });
  } catch (err) {
    console.error('Error exporting session logs:', err);
    res.status(500).json({ error: 'Failed to export session logs' });
  }
});

// Session logs PDF export endpoint
app.get('/api/session-logs/export-pdf', authenticateToken, authorizePermission('session_logs', 'view'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = db('session_logs').orderBy('login_time', 'desc');
    
    if (startDate) {
      query = query.where('login_time', '>=', new Date(startDate));
    }
    
    if (endDate) {
      query = query.where('login_time', '<=', new Date(endDate));
    }
    
    const logs = await query;
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=session-logs.pdf');

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Session Logs Report', { align: 'center' });
    doc.moveDown();
    
    // Add date range if specified
    if (startDate || endDate) {
      doc.fontSize(12).text(
        `Date Range: ${startDate || 'Beginning'} to ${endDate || 'Now'}`,
        { align: 'center' }
      );
      doc.moveDown();
    }
    
    // Add statistics
    const totalSessions = logs.length;
    const activeSessions = logs.filter(log => !log.logout_time).length;
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    
    doc.fontSize(14).text('Summary Statistics', { underline: true });
    doc.fontSize(12).text(`Total Sessions: ${totalSessions}`);
    doc.text(`Active Sessions: ${activeSessions}`);
    doc.text(`Average Duration: ${Math.round(avgDuration)} seconds`);
    doc.text(`Total Duration: ${Math.round(totalDuration)} seconds`);
    doc.moveDown();
    
    // Add table headers
    doc.fontSize(14).text('Session Details', { underline: true });
    doc.moveDown();
    
    const headers = ['ID', 'User ID', 'Login Time', 'Logout Time', 'IP Address', 'Duration'];
    const columnWidths = [50, 60, 120, 120, 100, 60];
    
    // Add table rows
    let y = doc.y;
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').fontSize(10)
         .text(header, 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, 
               { width: columnWidths[i], align: 'left' });
    });
    
    y += 20;
    
    logs.forEach(log => {
      doc.font('Helvetica').fontSize(10);
      
      const row = [
        log.id.toString(),
        log.user_id.toString(),
        new Date(log.login_time).toLocaleString(),
        log.logout_time ? new Date(log.logout_time).toLocaleString() : 'Active',
        log.ip_address,
        log.duration_seconds ? `${log.duration_seconds}s` : 'N/A'
      ];
      
      row.forEach((cell, i) => {
        doc.text(cell, 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, 
                { width: columnWidths[i], align: 'left' });
      });
      
      y += 20;
      
      // Add new page if we're at the bottom
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }
    });
    
    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Temporary admin user creation endpoint

// Import properties routes
//const propertiesRouter = require('./routes/properties');

// Mount properties routes with middleware
app.use('/api/properties',
  authenticateToken,
  authorizePermission('property_registrations', 'edit'),
  (req, res, next) => {
    // Add db to the request object
    req.db = db;
    next();
  },
  propertiesRouter
);

// Get all properties with pagination and search
// Helper: convert a DB row to camelCase response expected by frontend
function mapPropertyToCamel(row) {
  if (!row) return null;
  const cap = (s) => (!s ? '' : s.charAt(0).toUpperCase() + s.slice(1));
  // Ensure numbers for numeric fields and capitalized taxStatus for UI
  return {
    id: row.id,
    propertyNo: row.property_no,
    surveyNo: row.survey_no,
    wardNo: row.ward_no,
    streetName: row.street_name,
    area: row.area,
    city: row.city,
    pincode: row.pincode,
    ownerName: row.owner_name,
    ownerMobile: row.owner_mobile,
    ownerAadhaar: row.owner_aadhaar,
    ownerAddress: row.owner_address,
    taxAmount: Number(row.tax_amount ?? 0),
    taxYear: Number(row.tax_year ?? 0),
    taxStatus: cap(String(row.tax_status || 'pending')),
    lastPaidDate: row.last_paid_date,
    pendingAmount: Number(row.pending_amount ?? 0),
    createdBy: row.created_by,
    templeId: row.temple_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Import properties routes
//const propertiesRouter = require('./routes/properties');

// Mount properties routes with middleware
app.use('/api/properties',
  authenticateToken,
  (req, res, next) => {
    // Add db to the request object
    req.db = db;
    next();
  },
  propertiesRouter
);

// Create test data
app.post('/api/create-test-user', async (req, res) => {
  try {
    // First check if temple exists
    const temple = await db('temples').where({id: 1}).first();
    if (!temple) {
      await db('temples').insert({id: 1, name: 'Test Temple'});
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db('users').insert({
      username: 'admin',
      mobile: '9999999999',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      temple_id: 1,
      email: 'admin@test.com',
      full_name: 'Admin User',
      created_at: db.fn.now()
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mount admin members router
const createAdminMembersRouter = require('./routes/admin/members');
const adminMembersRouter = createAdminMembersRouter({
  db,
  authenticateToken,
  authorizePermission,
  authorizeRole
});
app.use('/api/admin/members', adminMembersRouter);

// All marriages routes are now handled in routes/marriages.js

// Mount marriages router
const createMarriagesRouter = require('./routes/marriages');
const marriagesRouter = createMarriagesRouter({ 
  db, 
  authenticateToken, 
  authorizeRole 
});
app.use('/api/marriages', marriagesRouter);

// Mount hall bookings router
const hallBookingsRouter = require('./hallBookings')({ db });
app.use('/api/hall-bookings', authenticateToken, authorizeRole(['admin','superadmin']), hallBookingsRouter);

// Mount donations router
const donationsRouter = require('./donations')({ db });
app.use('/api/donations', authenticateToken, donationsRouter);

// Mount annadhanam router
const annadhanamRouter = require('./annadhanam')({ db });
app.use('/api/annadhanam', authenticateToken, authorizePermission('annadhanam_registrations', 'view'), annadhanamRouter);

// Mount pooja router
const poojaRouter = require('./pooja')({ db });
app.use('/api/pooja', authenticateToken, authorizePermission('pooja_registrations', 'view'), poojaRouter);

// Mobile router already mounted at the top

// Mount pooja approval router (admin only)
const poojaApprovalRouter = require('./pooja-approval')({ db });
app.use('/api/pooja-approval', authenticateToken, authorizePermission('pooja_approval', 'view'), poojaApprovalRouter);

// Mount annadhanam approval router (admin only)
const annadhanamApprovalRouter = require('./annadhanam-approval')({ db });
app.use('/api/annadhanam-approval', authenticateToken, authorizePermission('annadhanam_approval', 'view'), annadhanamApprovalRouter);

// Mount donations approval router (admin only)
const donationsApprovalRouter = require('./donations-approval')({ db });
app.use('/api/donations-approval', authenticateToken, authorizePermission('donation_approval', 'view'), donationsApprovalRouter);

// Single registration PDF export is now handled in routes/registrations.js

// Import and use the registrations router with all necessary middleware
const createRegistrationsRouter = require('./routes/registrations');
const registrationsRouter = createRegistrationsRouter(db);

// Add logging middleware before routes
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// Ensure a writable temp upload directory exists (cross-platform)
const tempUploadDir = path.join(__dirname, '../public/uploads/tmp');
try {
  if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create temp upload dir:', tempUploadDir, e.message);
}

const upload = multer({ 
  dest: tempUploadDir,
  limits: { fileSize: 100 * 1024 } // 100KB
});

app.use('/api/registrations', upload.single('photo'), registrationsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
});

// Mount tax registrations router
const taxRegistrationsRouter = require('./components/tax-registrations');
app.use('/api/tax-registrations', taxRegistrationsRouter);

// Master Clans endpoints
app.get('/api/master-clans/:templeId', async (req, res) => {
  try {
    const clans = await db('master_clans')
      .where('temple_id', req.params.templeId)
      .select('*');
    res.json(clans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clans' });
  }
});

// Master Groups endpoints
app.get('/api/master-groups/:templeId', async (req, res) => {
  try {
    const groups = await db('master_groups')
      .where('temple_id', req.params.templeId)
      .select('*');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});