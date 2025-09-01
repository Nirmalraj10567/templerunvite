/*
API Documentation
=================

POST /api/login
---------------
Authenticate a user with mobile, templeId, username, and password.

Request Body (JSON):
{
  "mobile": "string",      // User's mobile number (required)
  "templeId": number,       // Temple ID (required)
  "username": "string",    // Username (required)
  "password": "string"     // Password (required)
}

Success Response (200):
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "mobile": "9087863189",
    "templeId": 1,
    "username": "arshaf",
    "role": "admin",
    "templeName": "Main Temple"
  }
}

POST /api/register
------------------
Register a new user (admin only)

Request Body (JSON):
{
  "mobile": "string",
  "username": "string",
  "password": "string",
  "email": "string",
  "fullName": "string",
  "role": "string", // member, admin, superadmin
  "templeId": number
}

GET /api/users/:templeId
------------------------
Get all users for a specific temple (admin/superadmin only)

GET /api/profile
----------------
Get current user profile (authenticated users)

PUT /api/profile
----------------
Update current user profile (authenticated users)

DELETE /api/users/:userId
-------------------------
Delete a user (superadmin only)

Middleware:
- authenticateToken: Verifies JWT token
- authorizeRole: Checks user role permissions
- rateLimit: Prevents brute force attacks
*/

const PDFDocument = require('pdfkit');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const knex = require('knex');
const path = require('path');

const app = express();
const PORT = 4000;

// Import routes
const propertiesRouter = require('./properties');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4002', 'http://localhost:4000', 'http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Mount routes
app.use('/api/properties', propertiesRouter);

// Add receipts endpoints
app.post('/api/receipts', authenticateToken, async (req, res) => {
  try {
    const { registerNo, date, type, fromPerson, toPerson, amount, remarks } = req.body;
    
    // Validate required fields
    if (!registerNo || !date || !type || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const receipt = await db('receipts').insert({
      register_no: registerNo,
      date,
      type,
      from_person: fromPerson,
      to_person: toPerson,
      amount,
      remarks,
      created_by: req.user.id,
      temple_id: req.user.templeId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    
    res.json({ success: true, id: receipt[0] });
  } catch (err) {
    console.error('Error saving receipt:', err);
    res.status(500).json({ error: 'Failed to save receipt' });
  }
});

app.get('/api/receipts', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    let query = db('receipts')
      .where('temple_id', req.user.templeId)
      .orderBy('date', 'desc');
    
    if (from) query = query.where('date', '>=', from);
    if (to) query = query.where('date', '<=', to);
    
    const receipts = await query.select('*');
    
    res.json({ success: true, data: receipts });
  } catch (err) {
    console.error('Error fetching receipts:', err);
    res.status(500).json({ error: 'Failed to fetch receipts' });
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

    // Add User Tax Registrations table (separate from user_registrations)
    if (!(await db.schema.hasTable('user_tax_registrations'))) {
      await db.schema.createTable('user_tax_registrations', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('reference_number');
        table.string('date');
        table.string('subdivision');
        table.string('name').notNullable();
        table.string('alternative_name');
        table.string('wife_name');
        table.string('education');
        table.string('occupation');
        table.string('father_name');
        table.string('address');
        table.string('birth_date');
        table.string('village');
        table.string('mobile_number');
        table.string('aadhaar_number');
        table.string('pan_number');
        table.string('clan');
        table.string('group');
        table.string('postal_code');
        table.integer('male_heirs').defaultTo(0);
        table.integer('female_heirs').defaultTo(0);
        table.integer('year').defaultTo(new Date().getFullYear());
        table.decimal('tax_amount', 10, 2).defaultTo(0);
        table.decimal('amount_paid', 10, 2).defaultTo(0);
        table.decimal('outstanding_amount', 10, 2).defaultTo(0);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created user_tax_registrations table.');
    }

    // Add Tax Settings table for year-based tax configuration
    if (!(await db.schema.hasTable('tax_settings'))) {
      await db.schema.createTable('tax_settings', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable();
        table.integer('year').notNullable();
        table.decimal('tax_amount', 10, 2).notNullable();
        table.string('description');
        table.boolean('is_active').defaultTo(true);
        table.boolean('include_previous_years').defaultTo(false);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.unique(['temple_id', 'year']); // One tax setting per year per temple
      });
      console.log('Created tax_settings table.');
    }

    // Add include_previous_years column if it doesn't exist (migration)
    const hasIncludePreviousYearsColumn = await db.schema.hasColumn('tax_settings', 'include_previous_years');
    if (!hasIncludePreviousYearsColumn) {
      await db.schema.alterTable('tax_settings', (table) => {
        table.boolean('include_previous_years').defaultTo(false);
      });
      console.log('Added include_previous_years column to tax_settings table.');
    }

    // Add dummy tax settings for 2023, 2024, 2025 if not exists
    const existingTaxSettings = await db('tax_settings').where('temple_id', 1).select('year');
    const existingYears = existingTaxSettings.map(s => s.year);
    
    const dummyTaxSettings = [
      { year: 2023, tax_amount: 450.00, description: 'Landowners Tax 2023', include_previous_years: true },
      { year: 2024, tax_amount: 500.00, description: 'Landowners Tax 2024', include_previous_years: true },
      { year: 2025, tax_amount: 600.00, description: 'Landowners Tax 2025', include_previous_years: false }
    ];

    for (const setting of dummyTaxSettings) {
      if (!existingYears.includes(setting.year)) {
        await db('tax_settings').insert({
          temple_id: 1,
          year: setting.year,
          tax_amount: setting.tax_amount,
          description: setting.description,
          is_active: true,
          include_previous_years: setting.include_previous_years,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        console.log(`Created tax setting for ${setting.year}: ₹${setting.tax_amount}`);
      }
    }

    // Add dummy tax registrations for testing cumulative calculations
    const existingTaxRegs = await db('user_tax_registrations').where('temple_id', 1).first();
    if (!existingTaxRegs) {
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

    // Create default superadmin user if not exists
    const superadminExists = await db('users').where({ username: 'superadmin' }).first();
    if (!superadminExists) {
      const hashedPassword = await bcrypt.hash('superadmin123', 10);
      await db('users').insert({
        mobile: '9999999999',
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
        mobile: '8888888888',
        username: 'admin',
        password: hashedPassword,
        email: 'admin@temple.com',
        full_name: 'Temple Administrator',
        temple_id: 1,
        role: 'admin',
        status: 'active'
      });
      console.log('Created default admin user');
    }

    // Add Master Records table
    if (!(await db.schema.hasTable('master_records'))) {
      await db.schema.createTable('master_records', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('date').notNullable();
        table.string('name').notNullable();
        table.string('under').notNullable();
        table.string('opening_balance').defaultTo('0');
        table.string('balance_type').defaultTo('credit');
        table.string('address_line1').defaultTo('');
        table.string('address_line2').defaultTo('');
        table.string('address_line3').defaultTo('');
        table.string('address_line4').defaultTo('');
        table.string('village').defaultTo('');
        table.string('telephone').defaultTo('');
        table.string('mobile').defaultTo('');
        table.string('email').defaultTo('');
        table.string('note').defaultTo('');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created master_records table.');
    }

    // Create user_permissions table if it doesn't exist
    if (!(await db.schema.hasTable('user_permissions'))) {
      await db.schema.createTable('user_permissions', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
        table.string('permission_id').notNullable();
        table.enum('access_level', ['view', 'edit', 'full', 'none']).defaultTo('none');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        // Unique constraint to prevent duplicate permissions for same user
        table.unique(['user_id', 'permission_id']);
      });
      console.log('Created user_permissions table.');
    }

    // Create activity_logs table
    if (!(await db.schema.hasTable('activity_logs'))) {
      await db.schema.createTable('activity_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable();
        table.integer('actor_user_id').notNullable();
        table.string('action').notNullable(); // e.g., member_created
        table.string('target_table'); // e.g., user_registrations
        table.integer('target_id');
        table.text('details'); // JSON string for extra info
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('Created activity_logs table.');
    }

    // Add Master People table
    if (!(await db.schema.hasTable('master_people'))) {
      await db.schema.createTable('master_people', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('name').notNullable();
        table.string('gender');
        table.string('dob');
        table.string('address');
        table.string('village');
        table.string('mobile');
        table.string('email');
        table.string('note');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created master_people table.');
    }

    // Add Master Groups table
    if (!(await db.schema.hasTable('master_groups'))) {
      await db.schema.createTable('master_groups', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('name').notNullable();
        table.string('description');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created master_groups table.');
    }

    // Add Master Clans table
    if (!(await db.schema.hasTable('master_clans'))) {
      await db.schema.createTable('master_clans', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('name').notNullable();
        table.string('description');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created master_clans table.');
    }

    // Add Master Occupations table
    if (!(await db.schema.hasTable('master_occupations'))) {
      await db.schema.createTable('master_occupations', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('name').notNullable();
        table.string('description');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created master_occupations table.');
    }

    // Add Master Villages table
    if (!(await db.schema.hasTable('master_villages'))) {
      await db.schema.createTable('master_villages', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('name').notNullable();
        table.string('description');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created master_villages table.');
    }

    // Add Master Educations table
    if (!(await db.schema.hasTable('master_educations'))) {
      await db.schema.createTable('master_educations', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('name').notNullable();
        table.string('description');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created master_educations table.');
    }

    // Add User Registrations table for user management
    if (!(await db.schema.hasTable('user_registrations'))) {
      await db.schema.createTable('user_registrations', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').defaultTo(1);
        table.string('reference_number');
        table.string('date');
        table.string('subdivision');
        table.string('name').notNullable();
        table.string('username'); // Added username field
        table.string('email'); // Added email field
        table.string('alternative_name');
        table.string('wife_name');
        table.string('education');
        table.string('occupation');
        table.string('father_name');
        table.string('address');
        table.string('birth_date');
        table.string('village');
        table.string('mobile_number');
        table.string('aadhaar_number');
        table.string('pan_number');
        table.string('clan');
        table.string('group');
        table.string('postal_code');
        table.integer('male_heirs').defaultTo(0);
        table.integer('female_heirs').defaultTo(0);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created user_registrations table.');
    } else {
      // Check if we need to add missing columns to existing table
      const columns = await db.raw("PRAGMA table_info(user_registrations)");
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('email')) {
        await db.raw('ALTER TABLE user_registrations ADD COLUMN email TEXT');
        console.log('Added email column to user_registrations table.');
      }
      
      if (!columnNames.includes('username')) {
        await db.raw('ALTER TABLE user_registrations ADD COLUMN username TEXT');
        console.log('Added username column to user_registrations table.');
      }

      // Check if aadhaar_number has NOT NULL constraint and fix it
      try {
        const tableInfo = await db.raw("PRAGMA table_info(user_registrations)");
        const aadhaarColumn = tableInfo.find(col => col.name === 'aadhaar_number');
        
        if (aadhaarColumn && aadhaarColumn.notnull === 1) {
          console.log('Fixing aadhaar_number NOT NULL constraint...');
          
          // Create a new table with correct schema
          await db.schema.createTable('user_registrations_new', (table) => {
            table.increments('id').primary();
            table.integer('temple_id').defaultTo(1);
            table.string('reference_number');
            table.string('date');
            table.string('subdivision');
            table.string('name').notNullable();
            table.string('username');
            table.string('email');
            table.string('alternative_name');
            table.string('wife_name');
            table.string('education');
            table.string('occupation');
            table.string('father_name');
            table.string('address');
            table.string('birth_date');
            table.string('village');
            table.string('mobile_number');
            table.string('aadhaar_number'); // This will be nullable
            table.string('pan_number');
            table.string('clan');
            table.string('group');
            table.string('postal_code');
            table.integer('male_heirs').defaultTo(0);
            table.integer('female_heirs').defaultTo(0);
            table.timestamp('created_at').defaultTo(db.fn.now());
            table.timestamp('updated_at').defaultTo(db.fn.now());
          });

          // Copy data from old table to new table
          await db.raw(`
            INSERT INTO user_registrations_new 
            SELECT * FROM user_registrations
          `);

          // Drop old table and rename new table
          await db.schema.dropTable('user_registrations');
          await db.schema.renameTable('user_registrations_new', 'user_registrations');
          
          console.log('Fixed aadhaar_number constraint - now nullable.');
        }
      } catch (error) {
        console.log('Note: Could not check/fix aadhaar_number constraint:', error.message);
      }
    }

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

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
}

console.log('Starting migration...');
migrate().then(() => {
  console.log('Migration completed, starting server...');
}).catch(err => {
  console.error('Migration failed:', err);
  console.log('Continuing with server startup...');
});

// Login endpoint with rate limiting
app.post('/api/login', async (req, res) => {
  const { mobile, username, password } = req.body;

  // Accept either username or mobile along with password
  if ((!mobile && !username) || !password) {
    return res.status(400).json({ 
      error: "Username or mobile and password are required."
    });
  }

  try {
    // Get user with temple information
    const userQuery = db('users')
      .join('temples', 'users.temple_id', 'temples.id')
      .where('users.status', 'active')
      .select('users.*', 'temples.name as templeName');

    // If both provided, match either. If one provided, match that one.
    if (mobile && username) {
      userQuery.andWhere(builder => builder.where('users.mobile', mobile).orWhere('users.username', username));
    } else if (mobile) {
      userQuery.andWhere('users.mobile', mobile);
    } else if (username) {
      userQuery.andWhere('users.username', username);
    }

    const user = await userQuery.first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or user not found.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update last login
    await db('users').where('id', user.id).update({ last_login: db.fn.now() });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        mobile: user.mobile, 
        username: user.username, 
        templeId: user.temple_id,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Load user permissions to support frontend permission guard
    const permissions = await db('user_permissions')
      .where({ user_id: user.id })
      .select('permission_id', 'access_level');

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    // Insert session log for login
    db('session_logs').insert({
      user_id: user.id,
      login_time: db.fn.now(),
      ip_address: ipAddress,
      user_agent: userAgent
    }).then(() => {
      console.log(`Logged login for user ${user.id}`);
    }).catch(err => {
      console.error('Error logging session:', err);
    });

    res.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
        templeId: user.temple_id,
        username: user.username,
        role: user.role,
        templeName: user.templeName,
        fullName: user.full_name,
        email: user.email,
        permissions
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Register endpoint (admin/superadmin only)
app.post('/api/register', authenticateToken, authorizePermission('user_management', 'edit'), async (req, res) => {
  const { mobile, username, password, email, fullName, role, templeId, customPermissions } = req.body;
  
  if (!mobile || !username || !password || !templeId) {
    return res.status(400).json({ error: 'Mobile, username, password, and templeId are required.' });
  }

  // Check if user has permission to create users for this temple
  if (req.user.templeId !== templeId) {
    return res.status(403).json({ error: 'You can only create users for your own temple.' });
  }

  // Validate role permissions
  if (req.user.role === 'admin' && role === 'superadmin') {
    return res.status(403).json({ error: 'Admins cannot create superadmin users.' });
  }

  try {
    // Check if user already exists
    const exists = await db('users').where({ mobile }).orWhere({ username }).first();
    if (exists) {
      return res.status(409).json({ error: 'Mobile number or username already registered.' });
    }

    // Check if temple exists
    const temple = await db('temples').where('id', templeId).first();
    if (!temple) {
      return res.status(400).json({ error: 'Invalid temple ID.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await db('users').insert({ 
      mobile, 
      username, 
      password: hashedPassword,
      email,
      full_name: fullName,
      temple_id: templeId,
      role: role || 'member'
    }).returning('*');

    // If custom permissions are provided, save them
    if (customPermissions && Array.isArray(customPermissions)) {
      const permissionRecords = customPermissions.map(perm => ({
        user_id: newUser[0].id,
        permission_id: perm.id,
        access_level: perm.access
      }));

      await db('user_permissions').insert(permissionRecords);
    }

    res.json({ 
      success: true, 
      user: {
        id: newUser[0].id,
        mobile: newUser[0].mobile,
        username: newUser[0].username,
        email: newUser[0].email,
        fullName: newUser[0].full_name,
        role: newUser[0].role,
        templeId: newUser[0].temple_id
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Database error during registration.' });
  }
});

// Get all users for a specific temple (admin/superadmin only)
app.get('/api/users/:templeId', authenticateToken, authorizeRole(['admin', 'superadmin']), authorizeTempleAccess, async (req, res) => {
  const { templeId } = req.params;

  try {
    const users = await db('user_registrations')
      .where('temple_id', templeId)
      .orderBy('created_at', 'desc');

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Database error while fetching users.' });
  }
});

// Get current user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db('users')
      .join('temples', 'users.temple_id', 'temples.id')
      .where('users.id', req.user.id)
      .select('users.*', 'temples.name as templeName')
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    delete user.password;
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Database error while fetching profile.' });
  }
});

// Update current user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { email, fullName, websiteLink, profileImage, trustInformation } = req.body;

  try {
    const updatedUser = await db('users')
      .where('id', req.user.id)
      .update({
        email: email || null,
        full_name: fullName || null,
        website_link: websiteLink || null,
        profile_image: profileImage || null,
        trust_information: trustInformation || null,
        updated_at: db.fn.now()
      })
      .returning('*');

    res.json({ success: true, user: updatedUser[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Database error while updating profile.' });
  }
});

// Update user (admin/superadmin only)
app.put('/api/users/:userId', authenticateToken, authorizePermission('user_management', 'edit'), async (req, res) => {
  const { userId } = req.params;
  const { email, fullName, role, status, customPermissions } = req.body;

  try {
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if user has permission to update users for this temple
    if (user.temple_id !== req.user.templeId) {
      return res.status(403).json({ error: 'You can only update users from your own temple.' });
    }

    // Validate role permissions
    if (req.user.role === 'admin' && role === 'superadmin') {
      return res.status(403).json({ error: 'Admins cannot promote users to superadmin.' });
    }

    if (req.user.role === 'admin' && user.role === 'superadmin') {
      return res.status(403).json({ error: 'Admins cannot modify superadmin users.' });
    }

    // Update user
    const updatedUser = await db('users')
      .where('id', userId)
      .update({
        email: email || user.email,
        full_name: fullName || user.full_name,
        role: role || user.role,
        status: status || user.status,
        updated_at: db.fn.now()
      })
      .returning('*');

    // If custom permissions are provided, update them
    if (customPermissions && Array.isArray(customPermissions)) {
      // Delete existing permissions
      await db('user_permissions').where('user_id', userId).del();
      
      // Insert new permissions
      const permissionRecords = customPermissions.map(perm => ({
        user_id: userId,
        permission_id: perm.id,
        access_level: perm.access
      }));

      await db('user_permissions').insert(permissionRecords);
    }

    res.json({ 
      success: true, 
      user: {
        id: updatedUser[0].id,
        mobile: updatedUser[0].mobile,
        username: updatedUser[0].username,
        email: updatedUser[0].email,
        fullName: updatedUser[0].full_name,
        role: updatedUser[0].role,
        status: updatedUser[0].status,
        templeId: updatedUser[0].temple_id
      }
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Database error while updating user.' });
  }
});

// Delete user (superadmin only)
app.delete('/api/users/:userId', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Superadmin can only delete users from their own temple
    if (user.temple_id !== req.user.templeId) {
      return res.status(403).json({ error: 'You can only delete users from your own temple.' });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot delete superadmin users.' });
    }

    await db('users').where('id', userId).del();
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Database error while deleting user.' });
  }
});

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

// Endpoint to save Master People data (authenticated users)
app.post('/api/master-people', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { 
    templeId, 
    name, 
    address, 
    village, 
    mobile, 
    mobileNumber 
  } = req.body;

  if (!templeId || !name) {
    return res.status(400).json({ error: 'Temple ID and name are required.' });
  }

  try {
    const newPeopleRecord = await retryOnBusy(() => db('master_people').insert({
      temple_id: templeId,
      name,
      gender: '',
      dob: '',
      address: Array.isArray(address) ? address.join(', ') : address,
      village: village || '',
      mobile: mobile || '',
      email: '',
      note: '',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }).returning('*'));

    console.log('Successfully saved master people record:', newPeopleRecord);
    res.json({ success: true, record: newPeopleRecord });
  } catch (err) {
    console.error('Error saving master people record - Full error:', err);
    res.status(500).json({ error: 'Database error while saving master people record.', details: err.message });
  }
});

// Endpoint to fetch Master People for a specific temple (authenticated users)
app.get('/api/master-people/:templeId', authenticateToken, authorizeTempleAccess, async (req, res) => {
  const { templeId } = req.params;

  try {
    const people = await db('master_people')
      .where('temple_id', templeId)
      .select('*')
      .orderBy('created_at', 'desc');
    res.json(people);
  } catch (err) {
    console.error('Error fetching master people:', err);
    res.status(500).json({ error: 'Database error while fetching master people.' });
  }
});

// Master Groups endpoints
app.post('/api/master-groups', authenticateToken, authorizePermission('master_data', 'edit'), async (req, res) => {
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required.' });
  }

  try {
    const newGroup = await retryOnBusy(() => db('master_groups').insert({
      temple_id: templeId,
      name: name.trim(),
      description: description || '',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));

    console.log('Successfully saved master group:', newGroup);
    res.status(201).json({ success: true, id: newGroup[0] });
  } catch (err) {
    console.error('Error saving master group:', err);
    res.status(500).json({ error: 'Database error while saving master group.' });
  }
});

app.get('/api/master-groups/:templeId', authenticateToken, authorizePermission('master_data', 'view'), async (req, res) => {
  const { templeId } = req.params;

  try {
    const groups = await db('master_groups')
      .where('temple_id', templeId)
      .orderBy('name', 'asc');

    res.json(groups);
  } catch (err) {
    console.error('Error fetching master groups:', err);
    res.status(500).json({ error: 'Database error while fetching master groups.' });
  }
});

// PUT endpoint for updating master groups
app.put('/api/master-groups/:id', authenticateToken, authorizePermission('master_data', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required.' });
  }

  try {
    // Check if group exists and belongs to user's temple
    const existingGroup = await db('master_groups')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingGroup) {
      return res.status(404).json({ error: 'Group not found or access denied.' });
    }

    await db('master_groups')
      .where({ id, temple_id: templeId })
      .update({
        name: name.trim(),
        description: description || '',
        updated_at: db.fn.now()
      });

    res.json({ success: true, message: 'Group updated successfully.' });
  } catch (err) {
    console.error('Error updating master group:', err);
    res.status(500).json({ error: 'Database error while updating master group.' });
  }
});

// DELETE endpoint for deleting master groups
app.delete('/api/master-groups/:id', authenticateToken, authorizePermission('master_data', 'full'), async (req, res) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    // Check if group exists and belongs to user's temple
    const existingGroup = await db('master_groups')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingGroup) {
      return res.status(404).json({ error: 'Group not found or access denied.' });
    }

    // Check if group is being used by any users
    const usersWithGroup = await db('user_registrations')
      .where({ group: existingGroup.name, temple_id: templeId })
      .first();

    if (usersWithGroup) {
      return res.status(400).json({ 
        error: 'Cannot delete group. It is currently being used by registered users.' 
      });
    }

    await db('master_groups')
      .where({ id, temple_id: templeId })
      .del();

    res.json({ success: true, message: 'Group deleted successfully.' });
  } catch (err) {
    console.error('Error deleting master group:', err);
    res.status(500).json({ error: 'Database error while deleting master group.' });
  }
});

// Master Clans endpoints
app.post('/api/master-clans', authenticateToken, authorizePermission('master_data', 'edit'), async (req, res) => {
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Clan name is required.' });
  }

  try {
    const newClan = await retryOnBusy(() => db('master_clans').insert({
      temple_id: templeId,
      name: name.trim(),
      description: description || '',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));

    console.log('Successfully saved master clan:', newClan);
    res.status(201).json({ success: true, id: newClan[0] });
  } catch (err) {
    console.error('Error saving master clan:', err);
    res.status(500).json({ error: 'Database error while saving master clan.' });
  }
});

app.get('/api/master-clans/:templeId', authenticateToken, authorizePermission('master_data', 'view'), async (req, res) => {
  const { templeId } = req.params;

  try {
    const clans = await db('master_clans')
      .where('temple_id', templeId)
      .orderBy('name', 'asc');

    res.json(clans);
  } catch (err) {
    console.error('Error fetching master clans:', err);
    res.status(500).json({ error: 'Database error while fetching master clans.' });
  }
});

// PUT endpoint for updating master clans
app.put('/api/master-clans/:id', authenticateToken, authorizePermission('master_data', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const templeId = req.user.templeId;

  if (!name) {
    return res.status(400).json({ error: 'Clan name is required.' });
  }

  try {
    // Check if clan exists and belongs to user's temple
    const existingClan = await db('master_clans')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingClan) {
      return res.status(404).json({ error: 'Clan not found or access denied.' });
    }

    await db('master_clans')
      .where({ id, temple_id: templeId })
      .update({
        name: name.trim(),
        description: description || '',
        updated_at: db.fn.now()
      });

    res.json({ success: true, message: 'Clan updated successfully.' });
  } catch (err) {
    console.error('Error updating master clan:', err);
    res.status(500).json({ error: 'Database error while updating master clan.' });
  }
});

// DELETE endpoint for deleting master clans
app.delete('/api/master-clans/:id', authenticateToken, authorizePermission('master_data', 'full'), async (req, res) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    // Check if clan exists and belongs to user's temple
    const existingClan = await db('master_clans')
      .where({ id, temple_id: templeId })
      .first();

    if (!existingClan) {
      return res.status(404).json({ error: 'Clan not found or access denied.' });
    }

    // Check if clan is being used by any users
    const usersWithClan = await db('user_registrations')
      .where({ clan: existingClan.name, temple_id: templeId })
      .first();

    if (usersWithClan) {
      return res.status(400).json({ 
        error: 'Cannot delete clan. It is currently being used by registered users.' 
      });
    }

    await db('master_clans')
      .where({ id, temple_id: templeId })
      .del();

    res.json({ success: true, message: 'Clan deleted successfully.' });
  } catch (err) {
    console.error('Error deleting master clan:', err);
    res.status(500).json({ error: 'Database error while deleting master clan.' });
  }
});

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
      date: date || new Date().toISOString().split('T')[0],
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

// Mount registrations router (create, update, delete, payment moved to module)
const createRegistrationsRouter = require('./registrations');
const registrationsRouter = createRegistrationsRouter({
  db,
  authenticateToken,
  authorizePermission,
  retryOnBusy,
  generateRegistrationReceipt
});
app.use('/api/registrations', registrationsRouter);

// Registration list route moved to module 'server/registrations.js'
// Registration single PDF export route moved to module 'server/registrations.js'
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
// Tax Registrations API
// =======================
// List tax registrations with pagination and search
app.get('/api/tax-registrations', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'), 
  async (req, res) => {
    try {
      const templeId = Number(req.query.templeId) || req.user.templeId;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      const search = String(req.query.search || '').trim();

      const baseQuery = db('user_tax_registrations').where('temple_id', templeId);
      if (search) {
        baseQuery.andWhere(builder => {
          builder
            .orWhere('name', 'like', `%${search}%`)
            .orWhere('mobile_number', 'like', `%${search}%`)
            .orWhere('aadhaar_number', 'like', `%${search}%`)
            .orWhere('reference_number', 'like', `%${search}%`);
        });
      }

      const [{ count }] = await baseQuery.clone().count({ count: '*' });
      const rows = await baseQuery
        .clone()
        .orderBy('created_at', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      res.json({ success: true, data: rows, page, pageSize, total: Number(count) });
    } catch (err) {
      console.error('Error listing tax registrations:', err);
      res.status(500).json({ error: 'Database error while listing tax registrations.' });
    }
  }
);

// Create tax registration
app.post('/api/tax-registrations', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'edit'), 
  async (req, res) => {
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
      year,
      taxAmount,
      amountPaid,
      outstandingAmount,
      templeId
    } = req.body;

    if (!name || !(templeId || req.user.templeId)) {
      return res.status(400).json({ error: 'Name and templeId are required.' });
    }

    try {
      const effectiveTempleId = Number(templeId || req.user.templeId);
      const [id] = await retryOnBusy(() => db('user_tax_registrations')
        .insert({
          reference_number: referenceNumber || '',
          date: date || new Date().toISOString().split('T')[0],
          subdivision: subdivision || '',
          name: String(name).trim(),
          alternative_name: alternativeName || '',
          wife_name: wifeName || '',
          education: education || '',
          occupation: occupation || '',
          father_name: fatherName || '',
          address: address || '',
          birth_date: birthDate || '',
          village: village || '',
          mobile_number: mobileNumber || '',
          aadhaar_number: aadhaarNumber || null,
          pan_number: panNumber || '',
          clan: clan || '',
          group: group || '',
          postal_code: postalCode || '',
          male_heirs: maleHeirs || 0,
          female_heirs: femaleHeirs || 0,
          year: year || new Date().getFullYear(),
          tax_amount: taxAmount || 0,
          amount_paid: amountPaid || 0,
          outstanding_amount: outstandingAmount || 0,
          temple_id: effectiveTempleId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('id')
      );

      res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('Error creating tax registration:', err);
      res.status(500).json({ error: 'Database error while creating tax registration.' });
    }
  }
);

// Update tax registration
app.put('/api/tax-registrations/:id', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'edit'), 
  async (req, res) => {
    const { id } = req.params;
    const effectiveTempleId = req.user.templeId;
    try {
      const existing = await db('user_tax_registrations')
        .where({ id, temple_id: effectiveTempleId })
        .first();
      if (!existing) {
        return res.status(404).json({ error: 'Tax registration not found or access denied.' });
      }

      const payload = req.body || {};
      const map = {
        reference_number: payload.referenceNumber,
        date: payload.date,
        subdivision: payload.subdivision,
        name: payload.name && String(payload.name).trim(),
        alternative_name: payload.alternativeName,
        wife_name: payload.wifeName,
        education: payload.education,
        occupation: payload.occupation,
        father_name: payload.fatherName,
        address: payload.address,
        birth_date: payload.birthDate,
        village: payload.village,
        mobile_number: payload.mobileNumber,
        aadhaar_number: payload.aadhaarNumber ?? null,
        pan_number: payload.panNumber,
        clan: payload.clan,
        group: payload.group,
        postal_code: payload.postalCode,
        male_heirs: payload.maleHeirs,
        female_heirs: payload.femaleHeirs,
        updated_at: db.fn.now()
      };

      Object.keys(map).forEach(k => map[k] === undefined && delete map[k]);

      await db('user_tax_registrations')
        .where({ id, temple_id: effectiveTempleId })
        .update(map);

      res.json({ success: true });
    } catch (err) {
      console.error('Error updating tax registration:', err);
      res.status(500).json({ error: 'Database error while updating tax registration.' });
    }
  }
);

// Delete tax registration
app.delete('/api/tax-registrations/:id', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'full'), 
  async (req, res) => {
    const { id } = req.params;
    const effectiveTempleId = req.user.templeId;
    try {
      const existing = await db('user_tax_registrations')
        .where({ id, temple_id: effectiveTempleId })
        .first();
      if (!existing) {
        return res.status(404).json({ error: 'Tax registration not found or access denied.' });
      }

      await db('user_tax_registrations').where({ id, temple_id: effectiveTempleId }).del();
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting tax registration:', err);
      res.status(500).json({ error: 'Database error while deleting tax registration.' });
    }
  }
);

// Export single tax registration as PDF
app.get('/api/tax-registrations/:id/pdf', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'), 
  async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;
    let PDFDocument;
    try {
      // Lazy import so server still runs if pdfkit isn't installed
      PDFDocument = require('pdfkit');
    } catch (e) {
      return res.status(501).json({ error: "PDF export not enabled. Run 'npm i pdfkit' in server/ and restart." });
    }

    try {
      const row = await db('user_tax_registrations')
        .where({ id, temple_id: templeId })
        .first();
      if (!row) return res.status(404).json({ error: 'Tax registration not found or access denied.' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=tax-registration-${row.id}.pdf`);

      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      doc.pipe(res);

      // Header
      doc.fontSize(16).text('Tax Registration / வரி பதிவு', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Temple ID: ${templeId} | Ref: ${row.reference_number || '-'} | ID: ${row.id}`);
      doc.moveDown(0.5);
      doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();
      doc.moveDown(0.5);

      const field = (en, ta, val) => {
        doc.fontSize(11).text(`${en} / ${ta}: `, { continued: true });
        doc.font('Helvetica-Bold').text(val ?? '-');
        doc.font('Helvetica');
      };

      // Body fields
      field('Name', 'பெயர்', row.name);
      field('Father Name', 'தந்தை', row.father_name);
      field('Mobile', 'கைபேசி', row.mobile_number);
      field('Aadhaar', 'ஆதார்', row.aadhaar_number || '-');
      field('Village', 'கிராமம்', row.village || '-');
      field('Address', 'முகவரி', row.address || '-');
      field('Subdivision', 'உட்பிரிவு', row.subdivision || '-');
      field('Year', 'வருடம்', row.year);
      field('Reference No', 'குறிப்பு எண்', row.reference_number || '-');
      field('Tax Amount', 'வரி தொகை', `₹${Number(row.tax_amount || 0).toFixed(2)}`);
      field('Amount Paid', 'செலுத்தியது', `₹${Number(row.amount_paid || 0).toFixed(2)}`);
      const outstanding = Number(row.outstanding_amount ?? Math.max(0, (row.tax_amount||0) - (row.amount_paid||0)));
      field('Outstanding', 'நிலுவை', `₹${outstanding.toFixed(2)}`);
      field('Created', 'உருவாக்கப்பட்டது', row.created_at ? new Date(row.created_at).toLocaleString() : '-');

      doc.end();
    } catch (err) {
      console.error('Error exporting tax registration PDF:', err);
      res.status(500).json({ error: 'Failed to generate PDF.' });
    }
  }
);

// Export multiple/filtered tax registrations as a single PDF (one per page)
app.get('/api/tax-registrations/export/pdf', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'), 
  async (req, res) => {
    const templeId = req.user.templeId;
    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (e) {
      return res.status(501).json({ error: "PDF export not enabled. Run 'npm i pdfkit' in server/ and restart." });
    }

    try {
      const search = String(req.query.search || '').trim();
      const ids = String(req.query.ids || '').trim();

      const q = db('user_tax_registrations').where('temple_id', templeId);
      if (search) {
        q.andWhere(builder => {
          builder
            .orWhere('name', 'like', `%${search}%`)
            .orWhere('mobile_number', 'like', `%${search}%`)
            .orWhere('aadhaar_number', 'like', `%${search}%`)
            .orWhere('reference_number', 'like', `%${search}%`);
        });
      }
      if (ids) {
        const arr = ids.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        if (arr.length) q.andWhereIn('id', arr);
      }

      const rows = await q.orderBy('created_at', 'desc').limit(1000);
      if (!rows.length) return res.status(404).json({ error: 'No records to export.' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename=tax-registrations.pdf');

      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      doc.pipe(res);

      const drawPage = (row, index) => {
        if (index > 0) doc.addPage();
        doc.fontSize(16).text('Tax Registration / வரி பதிவு', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Temple ID: ${templeId} | Ref: ${row.reference_number || '-'} | ID: ${row.id}`);
        doc.moveDown(0.5);
        doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();
        doc.moveDown(0.5);

        const field = (en, ta, val) => {
          doc.fontSize(11).text(`${en} / ${ta}: `, { continued: true });
          doc.font('Helvetica-Bold').text(val ?? '-');
          doc.font('Helvetica');
        };

        field('Name', 'பெயர்', row.name);
        field('Father Name', 'தந்தை', row.father_name);
        field('Mobile', 'கைபேசி', row.mobile_number);
        field('Aadhaar', 'ஆதார்', row.aadhaar_number || '-');
        field('Village', 'கிராமம்', row.village || '-');
        field('Address', 'முகவரி', row.address || '-');
        field('Subdivision', 'உட்பிரிவு', row.subdivision || '-');
        field('Year', 'வருடம்', row.year);
        field('Reference No', 'குறிப்பு எண்', row.reference_number || '-');
        field('Tax Amount', 'வரி தொகை', `₹${Number(row.tax_amount || 0).toFixed(2)}`);
        field('Amount Paid', 'செலுத்தியது', `₹${Number(row.amount_paid || 0).toFixed(2)}`);
        const outstanding = Number(row.outstanding_amount ?? Math.max(0, (row.tax_amount||0) - (row.amount_paid||0)));
        field('Outstanding', 'நிலுவை', `₹${outstanding.toFixed(2)}`);
        field('Created', 'உருவாக்கப்பட்டது', row.created_at ? new Date(row.created_at).toLocaleString() : '-');
      };

      rows.forEach((r, idx) => drawPage(r, idx));
      doc.end();
    } catch (err) {
      console.error('Error exporting tax registrations PDF:', err);
      res.status(500).json({ error: 'Failed to generate PDF.' });
    }
  }
);

// =======================
// TAX SETTINGS ENDPOINTS
// =======================

// List tax settings for a temple
app.get('/api/tax-settings', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'), 
  async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const settings = await db('tax_settings')
        .where('temple_id', templeId)
        .orderBy('year', 'desc');

      res.json({ success: true, data: settings });
    } catch (err) {
      console.error('Error listing tax settings:', err);
      res.status(500).json({ error: 'Database error while listing tax settings.' });
    }
  }
);

// Create or update tax setting
app.post('/api/tax-settings', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'edit'), 
  async (req, res) => {
    const { year, taxAmount, description, isActive, includePreviousYears } = req.body;
    const templeId = req.user.templeId;

    if (!year || !taxAmount) {
      return res.status(400).json({ error: 'Year and tax amount are required.' });
    }

    try {
      // Check if setting already exists for this year and temple
      const existing = await db('tax_settings')
        .where({ temple_id: templeId, year })
        .first();

      if (existing) {
        // Update existing setting
        await db('tax_settings')
          .where({ temple_id: templeId, year })
          .update({
            tax_amount: taxAmount,
            description: description || '',
            is_active: isActive !== undefined ? isActive : true,
            include_previous_years: includePreviousYears !== undefined ? includePreviousYears : false,
            updated_at: db.fn.now()
          });
        res.json({ success: true, id: existing.id, action: 'updated' });
      } else {
        // Create new setting
        const [id] = await db('tax_settings')
          .insert({
            temple_id: templeId,
            year,
            tax_amount: taxAmount,
            description: description || '',
            is_active: isActive !== undefined ? isActive : true,
            include_previous_years: includePreviousYears !== undefined ? includePreviousYears : false,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          })
          .returning('id');
        res.status(201).json({ success: true, id, action: 'created' });
      }
    } catch (err) {
      console.error('Error saving tax setting:', err);
      res.status(500).json({ error: 'Database error while saving tax setting.' });
    }
  }
);

// Delete tax setting
app.delete('/api/tax-settings/:id', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'full'), 
  async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;

    try {
      const existing = await db('tax_settings')
        .where({ id, temple_id: templeId })
        .first();
      
      if (!existing) {
        return res.status(404).json({ error: 'Tax setting not found or access denied.' });
      }

      await db('tax_settings').where({ id, temple_id: templeId }).del();
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting tax setting:', err);
      res.status(500).json({ error: 'Database error while deleting tax setting.' });
    }
  }
);

// Bulk toggle include_previous_years for all tax settings
app.post('/api/tax-settings/bulk-toggle', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'edit'), 
  async (req, res) => {
    try {
      const { includePreviousYears } = req.body;
      const templeId = req.user.templeId;

      await db('tax_settings')
        .where('temple_id', templeId)
        .update({
          include_previous_years: includePreviousYears !== undefined ? includePreviousYears : false,
          updated_at: db.fn.now()
        });

      res.json({ success: true });
    } catch (err) {
      console.error('Error bulk updating tax settings:', err);
      res.status(500).json({ error: 'Database error while updating tax settings.' });
    }
  }
);

// Get tax amount for a specific year
app.get('/api/tax-settings/year/:year', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'), 
  async (req, res) => {
    try {
      const { year } = req.params;
      const templeId = req.user.templeId;
      
      const setting = await db('tax_settings')
        .where({ temple_id: templeId, year, is_active: true })
        .first();

      if (setting) {
        res.json({ success: true, data: setting });
      } else {
        res.json({ success: true, data: null });
      }
    } catch (err) {
      console.error('Error getting tax setting for year:', err);
      res.status(500).json({ error: 'Database error while getting tax setting.' });
    }
  }
);

// Calculate cumulative tax for a user based on mobile number (NEW registrations only)
app.get('/api/tax-calculations/cumulative/:mobile', 
  authenticateToken, 
  authorizePermission('tax_registrations', 'view'), 
  async (req, res) => {
    try {
      const { mobile } = req.params;
      const { currentYear } = req.query;
      const templeId = req.user.templeId;
      
      // Get all tax settings for this temple (active ones)
      const taxSettings = await db('tax_settings')
        .where({ temple_id: templeId, is_active: true })
        .orderBy('year', 'asc');

      // Get all tax registrations for this mobile number
      const existingRegistrations = await db('user_tax_registrations')
        .where({ temple_id: templeId, mobile_number: mobile })
        .select('year', 'tax_amount', 'amount_paid', 'outstanding_amount');

      // Determine if this is a NEW registration for the current year
      const isNewUser = existingRegistrations.length === 0;
      const hasCurrentYearRegistration = existingRegistrations.some(r => r.year == currentYear);
      
      // Create a map of paid amounts by year
      const paidByYear = {};
      existingRegistrations.forEach(reg => {
        paidByYear[reg.year] = {
          taxAmount: parseFloat(reg.tax_amount) || 0,
          amountPaid: parseFloat(reg.amount_paid) || 0,
          outstanding: parseFloat(reg.outstanding_amount) || 0
        };
      });

      // Calculate cumulative outstanding
      let cumulativeOutstanding = 0;
      let currentYearTax = 0;
      const yearBreakdown = [];

      for (const setting of taxSettings) {
        const year = setting.year;
        const taxAmount = parseFloat(setting.tax_amount) || 0;
        
        if (year < currentYear) {
          // Previous years
          const paid = paidByYear[year];
          if (paid) {
            // User has a registration for this year - include actual outstanding
            const outstanding = Math.max(0, paid.taxAmount - paid.amountPaid);
            cumulativeOutstanding += outstanding;
            yearBreakdown.push({
              year,
              taxAmount: paid.taxAmount,
              amountPaid: paid.amountPaid,
              outstanding,
              status: 'registered'
            });
          } else {
            // User doesn't have registration for this year
            // Only include for NEW registrations if setting is enabled
            if (!hasCurrentYearRegistration && setting.include_previous_years) {
              cumulativeOutstanding += taxAmount;
              yearBreakdown.push({
                year,
                taxAmount,
                amountPaid: 0,
                outstanding: taxAmount,
                status: 'new_registration_previous_year'
              });
            }
          }
        } else if (year == currentYear) {
          // Current year
          currentYearTax = taxAmount;
          const paid = paidByYear[year];
          if (paid) {
            const outstanding = Math.max(0, paid.taxAmount - paid.amountPaid);
            yearBreakdown.push({
              year,
              taxAmount: paid.taxAmount,
              amountPaid: paid.amountPaid,
              outstanding,
              status: 'current_registered'
            });
          } else {
            yearBreakdown.push({
              year,
              taxAmount,
              amountPaid: 0,
              outstanding: taxAmount,
              status: 'current_new'
            });
          }
        }
      }

      const totalTaxDue = cumulativeOutstanding + currentYearTax;

      res.json({ 
        success: true, 
        data: {
          cumulativeOutstanding,
          currentYearTax,
          totalTaxDue,
          yearBreakdown,
          hasExistingRegistration: existingRegistrations.length > 0,
          isNewUser,
          joiningYear
        }
      });
    } catch (err) {
      console.error('Error calculating cumulative tax:', err);
      res.status(500).json({ error: 'Database error while calculating cumulative tax.' });
    }
  }
);

app.get('/', async (req, res) => {
  res.json("Temple Management API is running");
});

// Add a logout endpoint
app.post('/api/logout', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Find the latest session log without a logout time for this user
  db('session_logs')
    .where({ user_id: userId, logout_time: null })
    .orderBy('login_time', 'desc')
    .first()
    .then(session => {
      if (session) {
        const logoutTime = new Date();
        const durationSeconds = Math.floor((logoutTime - session.login_time) / 1000);
        
        return db('session_logs')
          .where({ id: session.id })
          .update({
            logout_time: logoutTime,
            duration_seconds: durationSeconds
          });
      }
      return Promise.resolve();
    })
    .then(() => {
      res.sendStatus(200);
    })
    .catch(err => {
      console.error('Error updating session log:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Add this middleware after auth middleware
// Kanikalar (Wedding) Module Endpoints

// Create new wedding
app.post('/api/kanikalar', authenticateToken, authorizePermission('manage_kanikalar'), async (req, res) => {
  try {
    const { bride_name, groom_name, wedding_date, venue, contact_number, email } = req.body;
    
    if (!bride_name || !groom_name || !wedding_date || !venue) {
      return res.status(400).json({ error: 'Bride name, groom name, wedding date, and venue are required' });
    }

    const [id] = await db('kanikalar').insert({
      bride_name,
      groom_name,
      wedding_date,
      venue,
      contact_number,
      email,
      created_by: req.user.id,
      temple_id: req.user.templeId
    });

    res.status(201).json({ id, message: 'Wedding created successfully' });
  } catch (error) {
    console.error('Error creating wedding:', error);
    res.status(500).json({ error: 'Failed to create wedding' });
  }
});

// Get all weddings
app.get('/api/kanikalar', authenticateToken, authorizePermission('view_kanikalar'), async (req, res) => {
  try {
    const weddings = await db('kanikalar')
      .where('temple_id', req.user.templeId)
      .select('*');
    res.json(weddings);
  } catch (error) {
    console.error('Error fetching weddings:', error);
    res.status(500).json({ error: 'Failed to fetch weddings' });
  }
});

// Get single wedding by ID
app.get('/api/kanikalar/:id', authenticateToken, authorizePermission('view_kanikalar'), async (req, res) => {
  try {
    const wedding = await db('kanikalar')
      .where({ 
        id: req.params.id,
        temple_id: req.user.templeId 
      })
      .first();
    
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    res.json(wedding);
  } catch (error) {
    console.error('Error fetching wedding:', error);
    res.status(500).json({ error: 'Failed to fetch wedding' });
  }
});

// Update wedding
app.put('/api/kanikalar/:id', authenticateToken, authorizePermission('manage_kanikalar'), async (req, res) => {
  try {
    const { bride_name, groom_name, wedding_date, venue, contact_number, email } = req.body;
    
    const updated = await db('kanikalar')
      .where({ 
        id: req.params.id,
        temple_id: req.user.templeId 
      })
      .update({
        bride_name,
        groom_name,
        wedding_date,
        venue,
        contact_number,
        email,
        updated_at: db.fn.now()
      });

    if (!updated) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    res.json({ message: 'Wedding updated successfully' });
  } catch (error) {
    console.error('Error updating wedding:', error);
    res.status(500).json({ error: 'Failed to update wedding' });
  }
});

// Delete wedding
app.delete('/api/kanikalar/:id', authenticateToken, authorizePermission('manage_kanikalar'), async (req, res) => {
  try {
    const deleted = await db('kanikalar')
      .where({ 
        id: req.params.id,
        temple_id: req.user.templeId 
      })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    res.json({ message: 'Wedding deleted successfully' });
  } catch (error) {
    console.error('Error deleting wedding:', error);
    res.status(500).json({ error: 'Failed to delete wedding' });
  }
});

// Wedding Events Endpoints
app.post('/api/wedding-events', authenticateToken, authorizePermission('manage_wedding_events'), async (req, res) => {
  try {
    const { kanikalar_id, event_name, event_date, event_time, location, description } = req.body;
    
    if (!kanikalar_id || !event_name || !event_date || !event_time || !location) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [id] = await db('wedding_events').insert({
      kanikalar_id,
      event_name,
      event_date,
      event_time,
      location,
      description,
      created_by: req.user.id
    });

    res.status(201).json({ id, message: 'Wedding event created successfully' });
  } catch (error) {
    console.error('Error creating wedding event:', error);
    res.status(500).json({ error: 'Failed to create wedding event' });
  }
});

// Get events for a wedding
app.get('/api/wedding-events/:kanikalarId', authenticateToken, authorizePermission('view_wedding_events'), async (req, res) => {
  try {
    const events = await db('wedding_events')
      .where('kanikalar_id', req.params.kanikalarId)
      .select('*');
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching wedding events:', error);
    res.status(500).json({ error: 'Failed to fetch wedding events' });
  }
});

// Update event
app.put('/api/wedding-events/:id', authenticateToken, authorizePermission('manage_wedding_events'), async (req, res) => {
  try {
    const { event_name, event_date, event_time, location, description } = req.body;
    
    const updated = await db('wedding_events')
      .where('id', req.params.id)
      .update({
        event_name,
        event_date,
        event_time,
        location,
        description,
        updated_at: db.fn.now()
      });

    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
app.delete('/api/wedding-events/:id', authenticateToken, authorizePermission('manage_wedding_events'), async (req, res) => {
  try {
    const deleted = await db('wedding_events')
      .where('id', req.params.id)
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

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

// Create logs table if not exists in migrations
if (!db.schema.hasTable('superadmin_logs')) {
  db.schema.createTable('superadmin_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('action').notNullable();
    table.string('ip_address').notNullable();
    table.string('user_agent');
    table.timestamp('timestamp').defaultTo(db.fn.now());
  })
  .then(() => console.log('Created superadmin_logs table'))
  .catch(err => console.error('Error creating superadmin_logs table', err));
}

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
app.get('/api/session-logs', authenticateToken, authorizePermission('view_session_logs', 'view'), async (req, res) => {
  try {
    const rawPage = req.query.page ?? 1;
    const rawPageSize = req.query.pageSize ?? 10;
    const page = Math.max(1, parseInt(rawPage, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(rawPageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    const logs = await db('session_logs')
      .select('*')
      .orderBy('login_time', 'desc')
      .limit(pageSize)
      .offset(offset);

    res.json(logs);
  } catch (err) {
    console.error('Error fetching session logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary admin user creation endpoint
// Property Registration Endpoints
app.post('/api/properties', authenticateToken, authorizePermission('property_registrations', 'edit'), async (req, res) => {
  try {
    const {
      propertyNo, surveyNo, wardNo, streetName, area, city, pincode,
      ownerName, ownerMobile, ownerAadhaar, ownerAddress,
      taxAmount, taxYear, taxStatus, lastPaidDate, pendingAmount
    } = req.body;

    // Support minimal payloads from the current frontend by providing safe defaults
    const now = new Date();
    const yearNow = now.getFullYear();
    const genPropNo = () => `PROP-${yearNow}-${Math.floor(Math.random() * 90000 + 10000)}`;

    const normalizedTaxStatus = (taxStatus || 'pending').toString().trim().toLowerCase();
    const amountNum = Number(taxAmount ?? 0) || 0;
    const pendingNum = pendingAmount != null ? Number(pendingAmount) : amountNum;
    const yearNum = Number(taxYear ?? yearNow) || yearNow;

    // Accept alternative field names coming from a simplified form
    const streetOrAddress = streetName || req.body.address || 'N/A';

    // Build insert payload with fallbacks for NOT NULL columns
    const insertData = {
      property_no: propertyNo || genPropNo(),
      survey_no: surveyNo || 'N/A',
      ward_no: wardNo || 'N/A',
      street_name: streetOrAddress,
      area: area || 'N/A',
      city: city || 'N/A',
      pincode: pincode || '000000',
      owner_name: ownerName || 'Unknown',
      owner_mobile: ownerMobile || '0000000000',
      owner_aadhaar: ownerAadhaar || null,
      owner_address: ownerAddress || null,
      tax_amount: amountNum,
      tax_year: yearNum,
      tax_status: normalizedTaxStatus, // stored lowercase
      last_paid_date: lastPaidDate ? new Date(lastPaidDate) : null,
      pending_amount: pendingNum,
      created_by: req.user.id,
      temple_id: req.user.templeId,
      created_at: now,
      updated_at: now
    };

    const [propertyId] = await db('properties').insert(insertData).returning('id');

    res.status(201).json({
      success: true,
      message: 'Property registered successfully',
      propertyId
    });
  } catch (error) {
    console.error('Error registering property:', error);
    res.status(500).json({ error: 'Failed to register property', details: error.message });
  }
});

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

// Helper: convert a camelCase payload to DB snake_case columns (safe update)
function mapCamelToSnakeUpdate(payload) {
  const out = {};
  const map = {
    propertyNo: 'property_no',
    surveyNo: 'survey_no',
    wardNo: 'ward_no',
    streetName: 'street_name',
    area: 'area',
    city: 'city',
    pincode: 'pincode',
    ownerName: 'owner_name',
    ownerMobile: 'owner_mobile',
    ownerAadhaar: 'owner_aadhaar',
    ownerAddress: 'owner_address',
    taxAmount: 'tax_amount',
    taxYear: 'tax_year',
    taxStatus: 'tax_status',
    lastPaidDate: 'last_paid_date',
    pendingAmount: 'pending_amount',
  };
  for (const [k, v] of Object.entries(payload || {})) {
    if (k in map) {
      if (k === 'taxAmount' || k === 'pendingAmount' || k === 'taxYear') {
        out[map[k]] = Number(v);
      } else if (k === 'taxStatus' && typeof v === 'string') {
        out[map[k]] = v.toLowerCase();
      } else {
        out[map[k]] = v;
      }
    } else if (k.includes('_')) {
      // already snake_case
      out[k] = v;
    }
  }
  return out;
}

app.get('/api/properties', authenticateToken, authorizePermission('property_registrations', 'view'), async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const templeId = req.user.templeId;

    // Base query
    let query = db('properties')
      .where('temple_id', templeId)
      .orderBy('created_at', 'desc');

    // Apply search if provided
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(function() {
        this.where('property_no', 'like', searchTerm)
          .orWhere('survey_no', 'like', searchTerm)
          .orWhere('owner_name', 'like', searchTerm)
          .orWhere('owner_mobile', 'like', searchTerm);
      });
    }

    // Get total count for pagination
    const [countResult] = await query.clone().clearSelect().count('* as total');
    const total = countResult.total;

    // Apply pagination
    const rows = await query
      .select('*')
      .limit(pageSize)
      .offset(offset);

    const properties = rows.map(mapPropertyToCamel);

    res.json({
      success: true,
      data: properties,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties', details: error.message });
  }
});

// Get single property by ID
app.get('/api/properties/:id', authenticateToken, authorizePermission('property_registrations', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;

    const row = await db('properties')
      .where({ id, temple_id: templeId })
      .first();

    if (!row) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      success: true,
      data: mapPropertyToCamel(row)
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property', details: error.message });
  }
});

// Update property
app.put('/api/properties/:id', authenticateToken, authorizePermission('property_registrations', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;
    // Accept camelCase payloads from frontend and normalize types
    const normalized = mapCamelToSnakeUpdate(req.body);
    const updateData = { ...normalized, updated_at: new Date() };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.created_by;
    delete updateData.temple_id;

    const updated = await db('properties')
      .where({ id, temple_id: templeId })
      .update(updateData);

    if (!updated) {
      return res.status(404).json({ error: 'Property not found or no changes made' });
    }

    res.json({
      success: true,
      message: 'Property updated successfully'
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property', details: error.message });
  }
});

// Delete property
app.delete('/api/properties/:id', authenticateToken, authorizePermission('property_registrations', 'full'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;

    const deleted = await db('properties')
      .where({ id, temple_id: templeId })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property', details: error.message });
  }
});

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

// Block/Unblock member (superadmin only)
app.put('/api/admin/members/:id/block', authenticateToken, authorizePermission('member_management', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;
    
    console.log(`[DEBUG] Block/unblock request for user id: ${id}, blocked: ${blocked}`);
    console.log(`[DEBUG] Authenticated user:`, req.user);
    
    // First try to find user by mobile if id is from user_registrations
    const user = await db('users')
      .leftJoin('user_registrations', 'users.mobile', 'user_registrations.mobile_number')
      .where('user_registrations.id', id)
      .orWhere('users.id', id)
      .select('users.id')
      .first();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const result = await db('users')
      .where('id', user.id)
      .update({ 
        status: blocked ? 'blocked' : 'active',
        updated_at: db.fn.now() 
      });
    
    console.log(`[DEBUG] Update result:`, result);
    
    if (result === 0) {
      console.log(`[WARN] No user found with id: ${id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Block/unblock error:', err);
    res.status(500).json({ error: 'Failed to update member status' });
  }
});

app.put('/api/admin/members/:id', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { email, fullName, role, status, customPermissions } = req.body;

  try {
    const updateData = {
      email: email || null,
      full_name: fullName || null,
      role: role || 'member',
      status: status || 'active',
      updated_at: db.fn.now()
    };

    await db('users').where('id', id).update(updateData);

    // Update permissions if provided
    if (customPermissions && Array.isArray(customPermissions)) {
      await db('user_permissions').where('user_id', id).del();
      
      const permissionRecords = customPermissions.map(perm => ({
        user_id: id,
        permission_id: perm.id,
        access_level: perm.access
      }));
      
      await db('user_permissions').insert(permissionRecords);
    }

    res.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).json({ error: 'Error updating member' });
  }
});

// Marriage Register Endpoints (placed after middleware definitions)
// List with optional search and date filter
app.get('/api/marriages', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { q, from, to, page = 1, pageSize = 20 } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (pg - 1) * ps;

    const query = db('marriage_registers')
      .where('temple_id', req.user.templeId)
      .modify((qb) => {
        if (q) {
          qb.andWhere((b) => {
            b.where('groom_name', 'like', `%${q}%`)
             .orWhere('bride_name', 'like', `%${q}%`)
             .orWhere('register_no', 'like', `%${q}%`)
             .orWhere('village', 'like', `%${q}%`);
          });
        }
        if (from) qb.andWhere('date', '>=', from);
        if (to) qb.andWhere('date', '<=', to);
      })
      .orderBy('date', 'desc')
      .limit(ps)
      .offset(offset);

    const rows = await query;
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/marriages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create
app.post('/api/marriages', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const payload = req.body || {};
    const record = {
      temple_id: req.user.templeId,
      register_no: payload.registerNo || null,
      date: payload.date || null,
      time: payload.time || null,
      event: payload.event || null,
      groom_name: payload.groomName || null,
      bride_name: payload.brideName || null,
      address: payload.address || null,
      village: payload.village || null,
      guardian_name: payload.guardianName || null,
      witness_one: payload.witnessOne || null,
      witness_two: payload.witnessTwo || null,
      remarks: payload.remarks || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };
    const inserted = await db('marriage_registers').insert(record).returning('*');
    res.json({ success: true, data: inserted[0] });
  } catch (err) {
    console.error('POST /api/marriages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update
app.put('/api/marriages/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const update = {
      register_no: payload.registerNo ?? null,
      date: payload.date ?? null,
      time: payload.time ?? null,
      event: payload.event ?? null,
      groom_name: payload.groomName ?? null,
      bride_name: payload.brideName ?? null,
      address: payload.address ?? null,
      village: payload.village ?? null,
      guardian_name: payload.guardianName ?? null,
      witness_one: payload.witnessOne ?? null,
      witness_two: payload.witnessTwo ?? null,
      remarks: payload.remarks ?? null,
      updated_at: db.fn.now(),
    };
    const result = await db('marriage_registers')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .update(update);
    if (!result) return res.status(404).json({ error: 'Not found' });
    const row = await db('marriage_registers').where({ id }).first();
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('PUT /api/marriages/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete
app.delete('/api/marriages/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db('marriage_registers')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .del();
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/marriages/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV export
app.get('/api/marriages/export', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const rows = await db('marriage_registers')
      .where('temple_id', req.user.templeId)
      .orderBy('date', 'desc');
    const headers = [
      'id,register_no,date,time,event,groom_name,bride_name,address,village,guardian_name,witness_one,witness_two,remarks'
    ];
    const csv = rows.map(r => [
      r.id, r.register_no, r.date, r.time, r.event, r.groom_name, r.bride_name,
      (r.address||'').replaceAll(',', ' '), (r.village||'').replaceAll(',', ' '), (r.guardian_name||'').replaceAll(',', ' '),
      (r.witness_one||'').replaceAll(',', ' '), (r.witness_two||'').replaceAll(',', ' '), (r.remarks||'').replaceAll(',', ' ')
    ].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="marriages.csv"');
    res.send(headers.join('\n') + '\n' + csv);
  } catch (err) {
    console.error('GET /api/marriages/export error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Marriage Hall Booking Endpoints
// List with optional search and date filter
app.get('/api/hall-bookings', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { q, from, to, page = 1, pageSize = 20 } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (pg - 1) * ps;

    const query = db('marriage_hall_bookings')
      .where('temple_id', req.user.templeId)
      .modify((qb) => {
        if (q) {
          qb.andWhere((b) => {
            b.where('name', 'like', `%${q}%`)
             .orWhere('register_no', 'like', `%${q}%`)
             .orWhere('village', 'like', `%${q}%`)
             .orWhere('mobile', 'like', `%${q}%`)
             .orWhere('event', 'like', `%${q}%`);
          });
        }
        if (from) qb.andWhere('date', '>=', from);
        if (to) qb.andWhere('date', '<=', to);
      })
      .orderBy('date', 'desc')
      .limit(ps)
      .offset(offset);

    const rows = await query;
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/hall-bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create hall booking
app.post('/api/hall-bookings', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const p = req.body || {};
    const record = {
      temple_id: req.user.templeId,
      register_no: p.registerNo || null,
      date: p.date || null,
      time: p.time || null,
      event: p.event || null,
      subdivision: p.subdivision || null,
      name: p.name || null,
      address: p.address || null,
      village: p.village || null,
      mobile: p.mobile || null,
      advance_amount: p.advanceAmount || null,
      total_amount: p.totalAmount || null,
      balance_amount: p.balanceAmount || null,
      remarks: p.remarks || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };
    const inserted = await db('marriage_hall_bookings').insert(record).returning('*');
    res.json({ success: true, data: inserted[0] });
  } catch (err) {
    console.error('POST /api/hall-bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update hall booking
app.put('/api/hall-bookings/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body || {};
    const update = {
      register_no: p.registerNo ?? null,
      date: p.date ?? null,
      time: p.time ?? null,
      event: p.event ?? null,
      subdivision: p.subdivision ?? null,
      name: p.name ?? null,
      address: p.address ?? null,
      village: p.village ?? null,
      mobile: p.mobile ?? null,
      advance_amount: p.advanceAmount ?? null,
      total_amount: p.totalAmount ?? null,
      balance_amount: p.balanceAmount ?? null,
      remarks: p.remarks ?? null,
      updated_at: db.fn.now(),
    };
    const result = await db('marriage_hall_bookings')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .update(update);
    if (!result) return res.status(404).json({ error: 'Not found' });
    const row = await db('marriage_hall_bookings').where({ id }).first();
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('PUT /api/hall-bookings/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete hall booking
app.delete('/api/hall-bookings/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db('marriage_hall_bookings')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .del();
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/hall-bookings/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV export for hall bookings
/*app.get('/api/hall-bookings/export', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const rows = await db('marriage_hall_bookings')
      .where('temple_id', req.user.templeId)
      .orderBy('date', 'desc');
    const headers = [
      'id,register_no,date,time,event,subdivision,name,address,village,mobile,advance_amount,total_amount,balance_amount,remarks'
    ];
    const csv = rows.map(r => [
      r.id, r.register_no, r.date, r.time, r.event, r.subdivision, r.name,
      (r.address||'').replaceAll(',', ' '), (r.village||'').replaceAll(',', ' '), (r.mobile||'').replaceAll(',', ' '),
      r.advance_amount, r.total_amount, r.balance_amount, (r.remarks||'').replaceAll(',', ' ')
    ].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hall_bookings.csv"');
    res.send(headers.join('\n') + '\n' + csv);
  } catch (err) {
    console.error('GET /api/hall-bookings/export error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});*/
// CSV export for hall bookings
app.get('/api/hall-bookings/export', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const rows = await db('marriage_hall_bookings')
      .where('temple_id', req.user.templeId)
      .orderBy('date', 'desc');
    const headers = [
      'id,register_no,date,time,event,subdivision,name,address,village,mobile,advance_amount,total_amount,balance_amount,remarks'
    ];
    const csv = rows.map(r => [
      r.id, r.register_no, r.date, r.time, r.event, r.subdivision, r.name,
      (r.address||'').replaceAll(',', ' '), (r.village||'').replaceAll(',', ' '), (r.mobile||'').replaceAll(',', ' '),
      r.advance_amount, r.total_amount, r.balance_amount, (r.remarks||'').replaceAll(',', ' ')
    ].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hall_bookings.csv"');
    res.send(headers.join('\n') + '\n' + csv);
  } catch (err) {
    console.error('GET /api/hall-bookings/export error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create donations table if it doesn't exist
db.schema.hasTable('donations').then(exists => {
  if (!exists) {
    return db.schema.createTable('donations', table => {
      table.increments('id').primary();
      table.integer('temple_id').notNullable();
      table.string('product_name').notNullable();
      table.text('description');
      table.decimal('price', 10, 2).notNullable();
      table.integer('quantity').defaultTo(1);
      table.string('category');
      table.string('donor_name');
      table.string('donor_contact');
      table.date('donation_date');
      table.enum('status', ['available', 'reserved', 'distributed']).defaultTo('available');
      table.text('notes');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }
});

// GET /api/donations - Get all donations for current temple
app.get('/api/donations', authenticateToken, async (req, res) => {
  try {
    const donations = await db('donations')
      .where('temple_id', req.user.templeId)
      .orderBy('created_at', 'desc');
    res.json({ success: true, data: donations });
  } catch (err) {
    console.error('GET /api/donations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/donations/:id - Get a single donation
app.get('/api/donations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await db('donations')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .first();
    
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    res.json({ success: true, data: donation });
  } catch (err) {
    console.error('GET /api/donations/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/donations - Fixed version
app.post('/api/donations', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    // Ensure required fields have values
    const productName = req.body.productName || req.body.registerNo || req.body.name || 'General Donation';
    const price = parseFloat(req.body.price || req.body.amount || 0);
    
    if (!productName || price <= 0) {
      return res.status(400).json({ 
        error: 'Product name and valid price/amount are required' 
      });
    }

    const donationData = {
      temple_id: req.user.templeId,
      product_name: productName,
      description: req.body.description || req.body.reason || '',
      price: price,
      quantity: parseInt(req.body.quantity || req.body.unit || 1),
      category: req.body.category || 'General',
      donor_name: req.body.donorName || req.body.name || 'Anonymous',
      donor_contact: req.body.donorContact || req.body.phone || '',
      donation_date: req.body.donationDate || req.body.date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'available',
      notes: req.body.notes || ''
    };

    const [id] = await db('donations').insert(donationData);
    const donation = await db('donations').where({ id }).first();
    
    res.json({ success: true, data: donation });
  } catch (err) {
    console.error('POST /api/donations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/donations/:id - Update a donation
app.put('/api/donations/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateData = {
      product_name: req.body.productName,
      description: req.body.description,
      price: req.body.price,
      quantity: req.body.quantity,
      category: req.body.category,
      donor_name: req.body.donorName,
      donor_contact: req.body.donorContact,
      donation_date: req.body.donationDate,
      status: req.body.status,
      notes: req.body.notes,
      updated_at: db.fn.now()
    };

    const result = await db('donations')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .update(updateData);
    
    if (!result) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    const donation = await db('donations').where({ id }).first();
    res.json({ success: true, data: donation });
  } catch (err) {
    console.error('PUT /api/donations/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/donations/:id - Delete a donation
app.delete('/api/donations/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db('donations')
      .where({ id })
      .andWhere('temple_id', req.user.templeId)
      .del();
    
    if (!result) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/donations/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/donations/export - Export donations as CSV
app.get('/api/donations/export', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
  try {
    const rows = await db('donations')
      .where('temple_id', req.user.templeId)
      .orderBy('created_at', 'desc');
    
    const headers = [
      'id,product_name,description,price,quantity,category,donor_name,donor_contact,donation_date,status,notes,created_at,updated_at'
    ];
    
    const csv = rows.map(r => [
      r.id, r.product_name, (r.description||'').replaceAll(',', ' '), r.price, r.quantity,
      r.category, r.donor_name, r.donor_contact, r.donation_date, r.status,
      (r.notes||'').replaceAll(',', ' '), r.created_at, r.updated_at
    ].join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
    res.send(headers.join('\n') + '\n' + csv);
  } catch (err) {
    console.error('GET /api/donations/export error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/registrations/:id/pdf - Generate PDF for a single registration

// GET /api/registrations/:id/pdf - Generate PDF for a single registration
app.get('/api/registrations/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const registration = await db('user_registrations').where({ id }).first();
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=registration_${registration.id}.pdf`);
    doc.pipe(res);

    // Helper to add a section with a title and line
    const addSection = (title) => {
      doc.moveDown(1.5);
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
      doc.moveDown(0.5);
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
    };

    // Helper to add a key-value pair
    const addRow = (key, value) => {
      doc.fontSize(11).font('Helvetica-Bold').text(key, { continued: true });
      doc.font('Helvetica').text(`: ${value || 'N/A'}`);
      doc.moveDown(0.5);
    };

    // Title
    doc.fontSize(22).font('Helvetica-Bold').text('Registration Details', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Receipt #: ${registration.receipt_number || 'N/A'}`, { align: 'center' });

    // Personal Information
    addSection('Personal Information');
    addRow('Name', registration.name);
    addRow("Father's Name", registration.father_name);
    addRow('Mobile Number', registration.mobile_number);
    addRow('Aadhaar Number', registration.aadhaar_number);
    addRow('Address', registration.address);
    addRow('Postal Code', registration.postal_code);

    // Family & Group
    addSection('Family & Group Information');
    addRow('Clan', registration.clan);
    addRow('Group', registration.group);
    addRow('Male Heirs', registration.male_heirs);
    addRow('Female Heirs', registration.female_heirs);

    // Financials (assuming these fields exist)
    if (registration.amount !== undefined) {
        addSection('Financial Information');
        addRow('Amount', `₹${registration.amount?.toLocaleString() || '0'}`);
        addRow('Amount Paid', `₹${registration.amount_paid?.toLocaleString() || '0'}`);
        addRow('Donation', `₹${registration.donation?.toLocaleString() || '0'}`);
        addRow('Total Amount', `₹${registration.total_amount?.toLocaleString() || '0'}`);
        addRow('Outstanding', `₹${registration.outstanding_amount?.toLocaleString() || '0'}`);
    }

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF on the server.' });
  }
});

// GET /api/registrations/export-pdf - Generate a bulk PDF for all registrations
app.get('/api/registrations/export-pdf', authenticateToken, async (req, res) => {
  try {
    // Fetch all registrations - in a real app, consider pagination or streaming for large datasets
    const registrations = await db('user_registrations').select('*');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=all_registrations.pdf');
    doc.pipe(res);

    // Title Page
    doc.fontSize(24).font('Helvetica-Bold').text('All Registration Records', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.text(`Total Records: ${registrations.length}`, { align: 'center' });
    doc.moveDown(2);

    // Table Headers
    const tableTop = doc.y;
    const itemX = 50;
    const receiptX = 150;
    const nameX = 250;
    const mobileX = 400;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('ID', itemX);
    doc.text('Receipt #', receiptX);
    doc.text('Name', nameX);
    doc.text('Mobile', mobileX);
    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(560, doc.y).stroke();

    // Table Rows
    doc.font('Helvetica').fontSize(9);
    for (const reg of registrations) {
      const y = doc.y + 5;
      if (y > 780) { // Check for page break
        doc.addPage();
        doc.y = 40;
      }
      doc.text(reg.id, itemX);
      doc.text(reg.receipt_number || 'N/A', receiptX);
      doc.text(reg.name, nameX, { width: 140, ellipsis: true });
      doc.text(reg.mobile_number || 'N/A', mobileX);
      doc.moveDown(1);
    }

    doc.end();

  } catch (error) {
    console.error('Error generating bulk PDF:', error);
    res.status(500).json({ error: 'Failed to generate bulk PDF on the server.' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT} (SQLite/Knex with JWT Auth)`);
});