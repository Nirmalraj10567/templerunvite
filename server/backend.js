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
const https = require('https');
const dotenv = require('dotenv');

const app = express();
const PORT = 4000;

// Load environment variables from server/env BEFORE accessing process.env
// This ensures JWT_SECRET and other vars are available.
dotenv.config({ path: path.join(__dirname, 'env') });

// Import routes
const propertiesRouter = require('./properties');
const ledgerRouter = require('./routes/ledger');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
// Ensure middleware that reads process.env.JWT_SECRET uses the same secret
//process.env.JWT_SECRET = JWT_SECRET;

// CORS: allow all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicitly handle preflight for all routes
app.options('*', cors());
app.use(bodyParser.json());

// Serve static files from the project's public directory (../public)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Knex config for SQLite (database in server directory)
const db = require('./db');
// Provide /api/ledger/accounts for account dropdowns
app.get('/api/ledger/accounts', authenticateToken, async (req, res) => {
  try {
    const defaults = [
      { value: 'CASH A/C', label: 'CASH A/C' },
      { value: 'BANK A/C', label: 'BANK A/C' },
      { value: 'INCOME A/C', label: 'INCOME A/C' },
      { value: 'EXPENSE A/C', label: 'EXPENSE A/C' },
    ];

    let used = [];
    try {
      const rows = await db('ledger_entries')
        .distinct('under')
        .whereNotNull('under')
        .andWhere('under', '!=', '')
        .orderBy('under', 'asc');
      used = rows.map(r => ({ value: r.under, label: r.under }));
    } catch (e) {
      used = [];
    }

// Helper to write money donation logs (top-level to avoid ReferenceError from inner scopes)
async function logMoneyDonationAction({ donationId, templeId, userId, action, details }) {
  try {
    const has = await db.schema.hasTable('money_donation_logs');
    if (!has) {
      await db.schema.createTable('money_donation_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.integer('donation_id').notNullable().index();
        table.string('action').notNullable(); // create | update | delete
        table.text('details'); // JSON string with full snapshot/diff
        table.integer('created_by').nullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const logData = {
      donation_id: Number(donationId),
      temple_id: Number(templeId),
      created_by: userId ? Number(userId) : null,
      action,
      details: details ? JSON.stringify(details) : null,
      created_at: db.fn.now(),
    };
    await db('money_donation_logs').insert(logData);
  } catch (e) {
    console.error('Failed to write money_donation_logs:', e.message);
  }
}

    let master = [];
    try {
      const cats = await db('ledger_categories').select('label');
      master = cats.map(c => ({ value: c.label, label: c.label }));
    } catch (e) {
      master = [];
    }

    // Merge unique by value, preserving order: defaults -> master -> used
    const map = new Map();
    for (const arr of [defaults, master, used]) {
      for (const it of arr) {
        if (!map.has(it.value)) map.set(it.value, it);
      }
    }
    const data = Array.from(map.values());
    res.json({ data });
  } catch (err) {
    console.error('Error fetching /api/ledger/accounts:', err);
    res.status(500).json({ error: 'Database error while fetching ledger entries.' });
  }
});

// Next Reference Number (year-based, per temple)
app.get('/api/tax-registrations/next-ref', authenticateToken, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const templeId = req.user.templeId;
    // Prefer max suffix if reference_number is stored like YYYY-0001, else fallback to count
    let seq = 0;
    try {
      const rows = await db('user_tax_registrations')
        .where({ temple_id: templeId, year })
        .whereNotNull('reference_number')
        .andWhere('reference_number', 'like', `${year}-%`)
        .select('reference_number');
      const nums = rows
        .map(r => String(r.reference_number || ''))
        .map(ref => {
          const m = ref.match(/^(\d{4})-(\d+)$/);
          return m ? Number(m[2]) : null;
        })
        .filter(n => Number.isFinite(n));
      seq = nums.length ? Math.max(...nums) : 0;
    } catch (e) {
      // ignore and fallback
      seq = 0;
    }
    if (!Number.isFinite(seq) || seq <= 0) {
      const cRow = await db('user_tax_registrations').where({ temple_id: templeId, year }).count({ c: '*' }).first();
      const c = Number(cRow?.c || cRow?.count || 0);
      seq = c;
    }
    const next = seq + 1;
    const ref = `${year}-${String(next).padStart(4, '0')}`;
    res.json({ success: true, ref, year });
  } catch (err) {
    console.error('Error computing next ref:', err);
    res.status(500).json({ error: 'Failed to compute next reference number' });
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

// Import routes
//const ledgerCategoriesRouter = require('./api/ledger-categories')({ db });

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Access denied. No JWT provided.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No JWT provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Access denied. Invalid JWT.' });
    }
    req.user = user;
    next();
  });
}

// Journal API endpoints for JournalLogPage and services
// GET /api/journal/entries - list with optional date range, account filter, pagination
app.get('/api/journal/entries', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const startDate = (req.query.startDate || '').toString().trim();
    const endDate = (req.query.endDate || '').toString().trim();
    const account = (req.query.account || '').toString().trim();
    const excludeZero = req.query.excludeZero === '1' || req.query.excludeZero === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let q = db('journal_entries').where('temple_id', templeId);
    if (startDate) q = q.andWhere('date', '>=', startDate);
    if (endDate) q = q.andWhere('date', '<=', endDate);
    if (account) {
      q = q.andWhere(builder => {
        builder
          .where('from_account', 'like', `%${account}%`)
          .orWhere('to_account', 'like', `%${account}%`);
      });
    }
    if (excludeZero) {
      q = q.andWhere('amount', '>', 0);
    }

    const totalRow = await q.clone().count({ c: '*' }).first();
    const total = Number(totalRow?.c || totalRow?.count || 0);

    const rows = await q
      .clone()
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    res.json({ data: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching /api/journal/entries:', err);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

// GET /api/journal/accounts - distinct account names seen in journal
app.get('/api/journal/accounts', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const froms = await db('journal_entries').where('temple_id', templeId).distinct('from_account as name');
    const tos = await db('journal_entries').where('temple_id', templeId).distinct('to_account as name');
    const list = [...froms, ...tos]
      .map(r => r.name)
      .filter(Boolean);
    const uniq = Array.from(new Set(list)).sort();
    res.json({ data: uniq.map(n => ({ name: n })) });
  } catch (err) {
    console.error('Error fetching /api/journal/accounts:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/journal/balance - alias of ledger balance for compatibility
app.get('/api/journal/balance', authenticateToken, async (req, res) => {
  try {
    const account = (req.query.account ? String(req.query.account) : 'CASH A/C').trim();
    const hasJournal = await db.schema.hasTable('journal_entries');
    if (!hasJournal) return res.json({ balance: 0, account });
    const inflowRow = await db('journal_entries').where({ temple_id: req.user.templeId, to_account: account }).sum({ s: 'amount' }).first();
    const outflowRow = await db('journal_entries').where({ temple_id: req.user.templeId, from_account: account }).sum({ s: 'amount' }).first();
    const inflow = Number(inflowRow?.s || inflowRow?.sum || 0);
    const outflow = Number(outflowRow?.s || outflowRow?.sum || 0);
    const balance = inflow - outflow;
    res.json({ balance, account });
  } catch (err) {
    console.error('Error in /api/journal/balance:', err);
    res.status(500).json({ error: 'Failed to compute balance' });
  }
});

// POST /api/journal/sync-pooja - manually sync existing pooja and money donation entries to journal
app.post('/api/journal/sync-pooja', authenticateToken, async (req, res) => {
  try {
    const hasJournal = await db.schema.hasTable('journal_entries');
    if (!hasJournal) {
      return res.status(400).json({ error: 'journal_entries table does not exist' });
    }

    const templeId = req.user.templeId;
    let totalCreated = 0;
    let totalSkipped = 0;

    // Sync pooja entries
    const poojas = await db('pooja')
      .where('temple_id', templeId)
      .whereNotNull('amount')
      .where('amount', '>', 0);

    let poojaCreated = 0;
    let poojaSkipped = 0;

    for (const pooja of poojas) {
      const existing = await db('journal_entries')
        .where({ reference_type: 'pooja', reference_id: pooja.id, temple_id: pooja.temple_id })
        .first();

      if (!existing) {
        await db('journal_entries').insert({
          date: new Date().toISOString().slice(0,10),
          from_account: 'POOJA A/C',
          to_account: pooja.transfer_to_account || 'INCOME A/C',
          amount: Number(pooja.amount),
          entry_type: 'transfer',
          remarks: pooja.remarks || null,
          reference_type: 'pooja',
          reference_id: pooja.id,
          temple_id: pooja.temple_id,
          created_by: pooja.created_by,
          created_at: db.fn.now(),
        });
        poojaCreated++;
      } else {
        poojaSkipped++;
      }
    }

    // Sync money donation entries
    const moneyDonations = await db('money_donations')
      .where('temple_id', templeId)
      .whereNotNull('amount')
      .where('amount', '>', 0);

    let donationCreated = 0;
    let donationSkipped = 0;

    for (const donation of moneyDonations) {
      const existing = await db('journal_entries')
        .where({ reference_type: 'money_donation', reference_id: donation.id, temple_id: donation.temple_id })
        .first();

      if (!existing) {
        await db('journal_entries').insert({
          date: donation.date || new Date().toISOString().slice(0,10),
          from_account: 'DONATION A/C',
          to_account: donation.transfer_to_account || 'INCOME A/C',
          amount: Number(donation.amount),
          entry_type: 'transfer',
          remarks: donation.reason || null,
          reference_type: 'money_donation',
          reference_id: donation.id,
          temple_id: donation.temple_id,
          created_by: donation.created_by,
          created_at: db.fn.now(),
        });
        donationCreated++;
      } else {
        donationSkipped++;
      }
    }

    totalCreated = poojaCreated + donationCreated;
    totalSkipped = poojaSkipped + donationSkipped;

    res.json({ 
      success: true, 
      created: totalCreated, 
      skipped: totalSkipped, 
      total: poojas.length + moneyDonations.length,
      details: {
        pooja: { created: poojaCreated, skipped: poojaSkipped, total: poojas.length },
        moneyDonations: { created: donationCreated, skipped: donationSkipped, total: moneyDonations.length }
      }
    });
  } catch (err) {
    console.error('Error syncing entries to journal:', err);
    res.status(500).json({ error: 'Failed to sync entries' });
  }
});

// Middleware to authorize user roles
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied. Insufficient role.' });
    }
    next();
  };
};

// ===============================
// Year-End System Status Endpoints
// ===============================
// Get current year-end status (auth required)
app.get('/api/system/year-end-status', authenticateToken, async (req, res) => {
  try {
    const enforcedRow = await db('system_settings').where({ key: 'year_end_enforced' }).first();
    const lockedRow = await db('system_settings').where({ key: 'year_end_locked' }).first();
    const parseVal = (row, def) => (row ? JSON.parse(row.value) : def);
    res.json({
      success: true,
      data: {
        enforced: parseVal(enforcedRow, false),
        locked: parseVal(lockedRow, false)
      }
    });
  } catch (err) {
    console.error('year-end-status get error:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Update year-end status (superadmin only)
app.post('/api/system/year-end-status', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
  try {
    const { enforced, locked } = req.body || {};
    const updates = [];
    if (typeof enforced === 'boolean') {
      updates.push(
        db('system_settings')
          .insert({ key: 'year_end_enforced', value: JSON.stringify(enforced), updated_at: db.fn.now() })
          .onConflict('key')
          .merge({ value: JSON.stringify(enforced), updated_at: db.fn.now() })
      );
    }
    if (typeof locked === 'boolean') {
      updates.push(
        db('system_settings')
          .insert({ key: 'year_end_locked', value: JSON.stringify(locked), updated_at: db.fn.now() })
          .onConflict('key')
          .merge({ value: JSON.stringify(locked), updated_at: db.fn.now() })
      );
    }
    await Promise.all(updates);
    res.json({ success: true });
  } catch (err) {
    console.error('year-end-status post error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Middleware to check if user has access to specific temple
const authorizeTempleAccess = (req, res, next) => {
  const userTempleId = req.user.templeId;
  const requestedTempleId = req.params.templeId || req.body.templeId;
  if (userTempleId !== requestedTempleId) {
    return res.status(403).json({ error: 'Access denied. Temple ID mismatch.' });
  }
  next();
};

// Enhanced authorizePermission middleware with superadmin bypass
const authorizePermission = (permissionId, requiredLevel = 'view') => {
  return async (req, res, next) => {
    if (req.user.role === 'superadmin') {
      return next();
    }

    try {
      // First, check explicit user permission
      let userAccessLevel = null;
      const userPermissions = await db('user_permissions')
        .where({ user_id: req.user.id, permission_id: permissionId })
        .first();
      if (userPermissions && userPermissions.access_level) {
        userAccessLevel = userPermissions.access_level;
      } else {
        // Fallback: check role-based permission
        try {
          const rolePerm = await db('role_permissions')
            .where({ role_id: req.user.role, permission_id: permissionId })
            .first();
          if (rolePerm && rolePerm.access_level) {
            userAccessLevel = rolePerm.access_level;
          }
        } catch (e) {
          // ignore and handle as no permission below
        }
      }

      if (!userAccessLevel) {
        return res.status(403).json({ error: 'Access denied. No permission.' });
      }

      if (userAccessLevel !== requiredLevel && userAccessLevel !== 'full') {
        return res.status(403).json({ error: 'Access denied. Insufficient permission level.' });
      }

      next();
    } catch (err) {
      console.error('Error authorizing permission:', err);
      res.status(500).json({ error: 'Database error while authorizing permission.' });
    }
  };
};

const hallApprovalRouter = require('./hall-approval')({ db, authenticateToken, authorizePermission });

// Mount routes
app.use('/api/properties', propertiesRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/hall-approval', hallApprovalRouter);

// Helper to write receipt logs in a dedicated table: receipt_logs
async function logReceiptAction({ receiptId, templeId, userId, action, details }) {
  try {
    const has = await db.schema.hasTable('receipt_logs');
    if (!has) {
      await db.schema.createTable('receipt_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.integer('receipt_id').notNullable().index();
        table.string('action').notNullable(); // create | update | delete
        table.text('details'); // JSON string with full snapshot/diff
        table.integer('created_by').nullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const payload = {
      receipt_id: Number(receiptId),
      temple_id: Number(templeId),
      created_by: userId ? Number(userId) : null,
      action,
      details: details ? JSON.stringify(details) : null,
      created_at: db.fn.now(),
    };
    await db('receipt_logs').insert(payload);
  } catch (e) {
    // Do not throw; logging must not break core flows
    console.error('Failed to write receipt_logs:', e.message);
  }
}
// Mount users router (auth and user management endpoints)
(() => {
  try {
    const usersRouter = require('./users')({ db, JWT_SECRET, authenticateToken });
    app.use('/api/users', usersRouter);
  } catch (e) {
    console.error('Failed to mount users router:', e);
  }
})();
// Hall bookings router will be mounted later with proper auth
// Mount moon API routes (moon-phases and moon-dates)
(() => {
  try {
    const moonApiRouter = require('./api/moon-phases');
    app.use('/api', moonApiRouter);
  } catch (e) {
    console.error('Failed to mount moon API router:', e);
  }
})();
// Mount mobile auth routes (public endpoints for OTP)
(() => {
  const mobileAuthRouter = require('./mobile-auth')({ db });
  // Do NOT put authenticateToken here so that /api/mobile-auth/send-otp and /verify-otp remain public
  app.use('/api/mobile-auth', mobileAuthRouter);
})();
// Mount hall-mobile routes (public; validation via mobile number and internal checks)
(() => {
  try {
    const hallMobileRouter = require('./hall-mobile')({ db });
    app.use('/api/hall-mobile', hallMobileRouter);
  } catch (e) {
    console.error('Failed to mount hall-mobile router:', e);
  }
})();
// Mount pooja-mobile routes (public; validation via mobile number and internal checks)
(() => {
  try {
    const poojaMobileRouter = require('./pooja-mobile')({ db });
    app.use('/api/pooja-mobile', poojaMobileRouter);
  } catch (e) {
    console.error('Failed to mount pooja-mobile router:', e);
  }
})();
// Mount donations-mobile routes (public; validation via mobile number and internal checks)
(() => {
  try {
    const donationsMobileRouter = require('./donations-mobile')({ db });
    app.use('/api/donations-mobile', donationsMobileRouter);
  } catch (e) {
    console.error('Failed to mount donations-mobile router:', e);
  }
})();
// Mount annadhanam-mobile routes (public; validation via mobile number and internal checks)
(() => {
  try {
    const annadhanamMobileRouter = require('./annadhanam-mobile')({ db });
    app.use('/api/annadhanam-mobile', annadhanamMobileRouter);
  } catch (e) {
    console.error('Failed to mount annadhanam-mobile router:', e);
  }
})();
// Mount tax-mobile routes (public; validation via mobile and templeId in query)
(() => {
  try {
    const taxMobileRouter = require('./tax-mobile')({ db });
    app.use('/api/tax-mobile', taxMobileRouter);
  } catch (e) {
    console.error('Failed to mount tax-mobile router:', e);
  }
})();
// Native categories router under /api/ledger to ensure /api/ledger/categories works
(() => {
  const express = require('express');
  const r = express.Router();

  // Helper to write money donation logs
  async function logMoneyDonationAction({ donationId, templeId, userId, action, details }) {
    try {
      const has = await db.schema.hasTable('money_donation_logs');
      if (!has) {
        console.warn('money_donation_logs table does not exist, creating it...');
        // Create the table if it doesn't exist
        await db.schema.createTable('money_donation_logs', (table) => {
          table.increments('id').primary();
          table.integer('temple_id').notNullable().index();
          table.integer('donation_id').notNullable().index();
          table.string('action').notNullable(); // create | update | delete
          table.text('details'); // JSON string with full snapshot/diff
          table.integer('created_by').nullable().index();
          table.timestamp('created_at').defaultTo(db.fn.now());
        });
        console.log('Created money_donation_logs table');
      }
      
      const logData = {
        donation_id: Number(donationId),
        temple_id: Number(templeId),
        created_by: userId ? Number(userId) : null,
        action,
        details: details ? JSON.stringify(details) : null,
        created_at: db.fn.now(),
      };
      
      console.log('Inserting money donation log:', logData);
      await db('money_donation_logs').insert(logData);
      console.log('Successfully inserted money donation log');
    } catch (e) {
      console.error('Failed to write money_donation_logs:', e.message);
      console.error('Error details:', e);
      throw e; // Re-throw to let caller handle
    }
  }

  // GET /api/ledger/categories
  r.get('/categories', authenticateToken, async (req, res) => {
    try {
      const templeId = req.user.templeId || req.query.templeId || 1;
      const rows = await db('ledger_categories')
        .where('temple_id', templeId)
        .select('*')
        .orderBy('label', 'asc');
      const data = rows.map((r) => ({ id: r.id, value: r.value || r.label, label: r.label || r.value }));
      res.json(data);
    } catch (err) {
      console.error('Error fetching categories (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // POST /api/ledger/categories
  r.post('/categories', authenticateToken, async (req, res) => {
    try {
      const { value, label, templeId } = req.body || {};
      const userTempleId = req.user.templeId || templeId || 1;
      
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });

      const exists = await db('ledger_categories')
        .where({ value, temple_id: userTempleId })
        .orWhere({ label, temple_id: userTempleId })
        .first();
      if (exists) return res.status(400).json({ error: 'Category already exists' });

      const [id] = await db('ledger_categories').insert({ 
        value, 
        label, 
        temple_id: userTempleId,
        created_at: db.fn.now() 
      });
      res.status(201).json({ id, value, label });
    } catch (err) {
      console.error('Error creating category (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // POST /api/ledger/categories/find-or-create
  r.post('/categories/find-or-create', authenticateToken, async (req, res) => {
    try {
      const { value, label, templeId } = req.body || {};
      const userTempleId = req.user.templeId || templeId || 1;
      
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });

      const existing = await db('ledger_categories')
        .where({ value, temple_id: userTempleId })
        .orWhere({ label, temple_id: userTempleId })
        .first();
      if (existing) return res.json({ id: existing.id, value: existing.value, label: existing.label });

      const [id] = await db('ledger_categories').insert({ 
        value, 
        label, 
        temple_id: userTempleId,
        created_at: db.fn.now() 
      });
      res.status(201).json({ id, value, label });
    } catch (err) {
      console.error('Error find-or-create category (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

// Provide /api/ledger/balance for compatibility (computed from journal_entries)
app.get('/api/ledger/balance', authenticateToken, async (req, res) => {
  try {
    const account = (req.query.account ? String(req.query.account) : 'CASH A/C').trim();
    const hasJournal = await db.schema.hasTable('journal_entries');
    if (!hasJournal) return res.json({ balance: 0, account });
    const inflowRow = await db('journal_entries').where({ temple_id: req.user.templeId, to_account: account }).sum({ s: 'amount' }).first();
    const outflowRow = await db('journal_entries').where({ temple_id: req.user.templeId, from_account: account }).sum({ s: 'amount' }).first();
    const inflow = Number(inflowRow?.s || inflowRow?.sum || 0);
    const outflow = Number(outflowRow?.s || outflowRow?.sum || 0);
    const balance = inflow - outflow;
    res.json({ balance, account });
  } catch (err) {
    console.error('Error in /api/ledger/balance:', err);
    res.status(500).json({ error: 'Failed to compute balance' });
  }
});

  // PUT /api/ledger/categories/:id
  r.put('/categories/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { value, label, templeId } = req.body || {};
      const userTempleId = req.user.templeId || templeId || 1;
      
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });
      
      // Check if category belongs to the user's temple
      const existing = await db('ledger_categories')
        .where({ id: Number(id), temple_id: userTempleId })
        .first();
      
      if (!existing) {
        return res.status(404).json({ error: 'Category not found or access denied' });
      }
      
      await db('ledger_categories')
        .where({ id: Number(id), temple_id: userTempleId })
        .update({ value, label });
      res.json({ id: Number(id), value, label });
    } catch (err) {
      console.error('Error updating /api/ledger/categories:', err);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  // DELETE /api/ledger/categories/:id
  r.delete('/categories/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const templeId = req.user.templeId || req.query.templeId || 1;
      
      // Check if category belongs to the user's temple
      const existing = await db('ledger_categories')
        .where({ id: Number(id), temple_id: templeId })
        .first();
      
      if (!existing) {
        return res.status(404).json({ error: 'Category not found or access denied' });
      }
      
      await db('ledger_categories')
        .where({ id: Number(id), temple_id: templeId })
        .del();
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting /api/ledger/categories:', err);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  app.use('/api/ledger', r);
})();

// Provide /api/ledger/names for frontend compatibility
app.get('/api/superadmin/tenants/stats', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
  try {
    const rows = await db('external_temple_databases').where({ status: 'active' }).select('*');
    const results = [];
    for (const t of rows) {
      let k = null;
      const out = { id: t.id, name: t.name, dbPath: t.db_path, totalMembers: 0, moneyDonations: 0, poojaCount: 0, activeSessions: 0, latestReceiptDate: null, dbSizeBytes: null };
      try {
        k = knex({ client: 'sqlite3', connection: { filename: t.db_path }, useNullAsDefault: true });
        // Count members
        try {
          const c = await k('user_registrations').count({ c: '*' }).first();
          out.totalMembers = Number(c?.c || c?.count || 0);
        } catch {}
        // Count money donations
        try {
          const c2 = await k('money_donations').count({ c: '*' }).first();
          out.moneyDonations = Number(c2?.c || c2?.count || 0);
        } catch {}
        // Count pooja
        try {
          const c3 = await k('pooja').count({ c: '*' }).first();
          out.poojaCount = Number(c3?.c || c3?.count || 0);
        } catch {}
        // Active sessions (if sessions table exists, where logout_time is null or last_activity recent)
        try {
          const hasSessions = await k.schema.hasTable('sessions');
          if (hasSessions) {
            const act = await k('sessions').whereNull('logout_time').count({ c: '*' }).first();
            out.activeSessions = Number(act?.c || act?.count || 0);
          }
        } catch {}
        // Latest receipt date
        try {
          const hasReceipts = await k.schema.hasTable('receipts');
          if (hasReceipts) {
            const row = await k('receipts').max({ d: 'date' }).first();
            out.latestReceiptDate = row?.d || row?.max || null;
          }
        } catch {}
        // DB file size
        try {
          const fs = require('fs');
          const stat = fs.statSync(t.db_path);
          out.dbSizeBytes = stat.size;
        } catch {}
      } catch (e) {
        console.error(`Failed to aggregate for ${t.name}:`, e.message);
      } finally {
        if (k && typeof k?.destroy === 'function') {
          try { await k.destroy(); } catch {}
        }
      }
      results.push(out);
    }
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Failed to fetch tenant stats:', err);
    res.status(500).json({ error: 'Failed to fetch tenant stats' });
  }
});

// Health check per tenant: verifies required tables and last data update timestamps
app.get('/api/superadmin/tenants/:id/health', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const t = await db('external_temple_databases').where({ id }).first();
    if (!t) return res.status(404).json({ error: 'Tenant not found' });
    const report = { id: t.id, name: t.name, dbPath: t.db_path, ok: true, checks: [] };
    let k = null;
    try {
      k = knex({ client: 'sqlite3', connection: { filename: t.db_path }, useNullAsDefault: true });
      const requiredTables = ['users','temples','user_registrations','receipts'];
      for (const tbl of requiredTables) {
        try {
          const has = await k.schema.hasTable(tbl);
          report.checks.push({ table: tbl, exists: !!has });
          if (!has) report.ok = false;
        } catch (e) {
          report.checks.push({ table: tbl, exists: false, error: e.message });
          report.ok = false;
        }
      }
      // last data updates
      try {
        const r = await k('receipts').max({ d: 'date' }).first();
        report.lastReceiptDate = r?.d || r?.max || null;
      } catch {}
      try {
        const hasSessions = await k.schema.hasTable('sessions');
        if (hasSessions) {
          const s = await k('sessions').max({ d: 'last_activity' }).first();
          report.lastSessionActivity = s?.d || s?.max || null;
        }
      } catch {}
    } catch (e) {
      report.ok = false;
      report.error = e.message;
    } finally {
      if (k && typeof k?.destroy === 'function') {
        try { await k.destroy(); } catch {}
      }
    }
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Tenant health error:', err);
    res.status(500).json({ error: 'Failed to check health' });
  }
});

// Public Mobile Events endpoint (simplified format, no JWT)
app.get('/api/mobile/events', async (req, res) => {
  try {
    const { from, to, templeId: qTempleId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    // Resolve templeId: query param -> req.user.templeId -> first temple -> 1
    let templeId = Number(qTempleId) || null;
    try {
      if (!templeId && req.user && Number(req.user.templeId)) {
        templeId = Number(req.user.templeId);
      }
      if (templeId) {
        const t = await db('temples').where({ id: templeId }).first();
        if (!t) templeId = null;
      }
      if (!templeId) {
        let row = null;
        try { row = await db('temples').min({ id: 'id' }).first(); } catch {}
        templeId = Number(row?.id) || 1;
      }
    } catch { templeId = 1; }

    // Check for events.temple_id column
    let hasTempleCol = false;
    try { hasTempleCol = await db.schema.hasColumn('events', 'temple_id'); } catch {}

    // Build query with optional filters
    let query = db('events');
    if (hasTempleCol) query = query.where('temple_id', templeId);
    query = query.where('date', '>=', from || today);
    if (to) query = query.andWhere('date', '<=', to);
    query = query.orderBy('date', 'asc').orderBy('time', 'asc').limit(50);

    const events = await query.select('*');

    const eventIds = events.map(e => e.id).filter(Boolean);
    let images = [];
    try {
      if (eventIds.length) {
        images = await db('event_images')
          .whereIn('event_id', eventIds)
          .groupBy('event_id')
          .select('event_id', 'image_path');
      }
    } catch (e) {
      images = [];
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const mobileEvents = events.map(event => {
      const img = images.find(img => img.event_id === event.id);
      return {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        image: img ? `${baseUrl}/public${img.image_path}` : null,
        description: event.description,
        temple_id: hasTempleCol ? event.temple_id : templeId,
      };
    });

    res.json({ success: true, data: mobileEvents, temple_id: templeId });
  } catch (error) {
    console.error('GET /api/mobile/events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Donation products router under /api/donation-products
(() => {
  const express = require('express');
  const r = express.Router();

  // GET /api/donation-products
  r.get('/', authenticateToken, authorizePermission('view_donations', 'view'), async (req, res) => {
    try {
      const rows = await db('donation_products').select('*').orderBy('label', 'asc');
      const data = rows.map(row => ({ id: row.id, value: row.value || row.label, label: row.label || row.value, unit: row.unit || '' }));
      res.json({ data });
    } catch (err) {
      console.error('Error fetching /api/donation-products:', err);
      res.status(500).json({ error: 'Failed to fetch donation products' });
    }
  });

  // POST /api/donation-products
  r.post('/', authenticateToken, authorizePermission('edit_donations', 'edit'), async (req, res) => {
    try {
      const { value, label, unit } = req.body || {};
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });
      const exists = await db('donation_products').where({ value }).orWhere({ label }).first();
      if (exists) return res.status(400).json({ error: 'Product already exists' });
      const [id] = await db('donation_products').insert({ value, label, unit: unit || null, created_at: db.fn.now() });
      res.status(201).json({ id, value, label, unit: unit || '' });
    } catch (err) {
      console.error('Error creating /api/donation-products:', err);
      res.status(500).json({ error: 'Failed to create donation product' });
    }
  });

  // POST /api/donation-products/find-or-create
  r.post('/find-or-create', authenticateToken, authorizePermission('edit_donations', 'edit'), async (req, res) => {
    try {
      const { value, label, unit } = req.body || {};
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });
      const existing = await db('donation_products').where({ value }).orWhere({ label }).first();
      if (existing) return res.json({ id: existing.id, value: existing.value, label: existing.label, unit: existing.unit || '' });
      const [id] = await db('donation_products').insert({ value, label, unit: unit || null, created_at: db.fn.now() });
      res.status(201).json({ id, value, label, unit: unit || '' });
    } catch (err) {
      console.error('Error find-or-create /api/donation-products:', err);
      res.status(500).json({ error: 'Failed to create donation product' });
    }
  });

  // PUT /api/donation-products/:id
  r.put('/:id', authenticateToken, authorizePermission('edit_donations', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const { value, label, unit } = req.body || {};
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });
      await db('donation_products').where({ id: Number(id) }).update({ value, label, unit: unit || null, updated_at: db.fn.now() });
      res.json({ id: Number(id), value, label, unit: unit || '' });
    } catch (err) {
      console.error('Error updating /api/donation-products:', err);
      res.status(500).json({ error: 'Failed to update donation product' });
    }
  });

  // DELETE /api/donation-products/:id
  r.delete('/:id', authenticateToken, authorizePermission('edit_donations', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      await db('donation_products').where({ id: Number(id) }).del();
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting /api/donation-products:', err);
      res.status(500).json({ error: 'Failed to delete donation product' });
    }
  });

  app.use('/api/donation-products', r);
})();

// Money donations router under /api/money-donations
(() => {
  const express = require('express');
  const r = express.Router();

  // List money donations (current user temple)
  r.get('/', authenticateToken, authorizePermission('view_donations', 'view'), async (req, res) => {
    try {
      const rows = await db('money_donations')
        .where('temple_id', req.user.templeId)
        .orderBy('date', 'desc')
        .select('*');
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Error fetching /api/money-donations:', err);
      res.status(500).json({ error: 'Failed to fetch money donations' });
    }
  });

  // GET /api/money-donations/next-register-no - Get next register number
  r.get('/next-register-no', authenticateToken, async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get the highest register number for current year
      const lastRecord = await db('money_donations')
        .where('temple_id', req.user.templeId)
        .where('register_no', 'like', `${currentYear}-%`)
        .orderBy('register_no', 'desc')
        .select('register_no')
        .first();

      let nextNumber = 1;
      
      if (lastRecord && lastRecord.register_no) {
        // Extract the number part after the year
        const parts = lastRecord.register_no.split('-');
        if (parts.length === 2 && parts[0] === String(currentYear)) {
          const lastNumber = parseInt(parts[1], 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }

      const nextRegisterNo = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
      
      res.json({ 
        success: true, 
        nextRegisterNo,
        currentYear,
        nextNumber
      });
    } catch (err) {
      console.error('Error generating next register number:', err);
      res.status(500).json({ error: 'Failed to generate next register number' });
    }
  });

  // Create money donation
  r.post('/', authenticateToken, authorizePermission('edit_donations', 'edit'), async (req, res) => {
    try {
      const b = req.body || {};
      const amount = Number(b.amount || 0);
      if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Valid amount is required' });
      const payload = {
        register_no: b.registerNo || '',
        date: b.date || new Date().toISOString().slice(0,10),
        name: b.name || '',
        father_name: b.fatherName || '',
        address: b.address || '',
        village: b.village || '',
        phone: b.phone || '',
        amount: amount,
        reason: b.reason || '',
        transfer_to_account: b.transfer_to_account || b.transferTo || 'INCOME A/C',
        temple_id: req.user.templeId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      const [id] = await db('money_donations').insert(payload);
      const row = await db('money_donations').where({ id }).first();

      // Log creation with full snapshot
      try {
        await logMoneyDonationAction({
          donationId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'create',
          details: row || { ...payload, id },
        });
        console.log('Successfully logged money donation creation for ID:', id);
      } catch (logError) {
        console.error('Failed to log money donation creation:', logError);
        // Don't fail the request if logging fails, but log the error
      }

      // Also record a journal entry: DONATION A/C -> INCOME A/C (or selected)
      try {
        const fromAccount = b.fromAccount || 'DONATION A/C';
        const toAccount = row.transfer_to_account || b.transferTo || 'INCOME A/C';
        const hasJournal = await db.schema.hasTable('journal_entries');
        if (hasJournal) {
          await db('journal_entries').insert({
            date: row.date,
            from_account: fromAccount,
            to_account: toAccount,
            amount: row.amount,
            // Use 'transfer' to satisfy DB CHECK constraint reliably
            entry_type: 'transfer',
            remarks: row.reason || null,
            reference_type: 'money_donation',
            reference_id: row.id,
            temple_id: req.user.templeId,
            created_by: req.user.id,
            created_at: db.fn.now(),
          });
        }
      } catch (e) {
        console.error('Failed to insert journal entry for donation:', e);
        // Do not fail the main request
      }

      res.json({ success: true, data: row });
    } catch (err) {
      console.error('Error creating /api/money-donations:', err);
      res.status(500).json({ error: 'Failed to create money donation' });
    }
  });

  // Get single
  r.get('/:id', authenticateToken, authorizePermission('view_donations', 'view'), async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('money_donations').where({ id }).andWhere('temple_id', req.user.templeId).first();
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('Error reading /api/money-donations/:id:', err);
      res.status(500).json({ error: 'Failed to read money donation' });
    }
  });

  // Update
  r.put('/:id', authenticateToken, authorizePermission('edit_donations', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const b = req.body || {};
      const templeId = req.user.templeId;
      // BEFORE snapshot
      const beforeRow = await db('money_donations').where({ id }).andWhere('temple_id', templeId).first();
      if (!beforeRow) return res.status(404).json({ error: 'Not found' });
      
      const update = {
        register_no: b.registerNo,
        date: b.date,
        name: b.name,
        father_name: b.fatherName,
        address: b.address,
        village: b.village,
        phone: b.phone,
        amount: b.amount != null ? Number(b.amount) : undefined,
        reason: b.reason,
        transfer_to_account: b.transfer_to_account ?? b.transferTo,
        updated_at: db.fn.now(),
      };
      // remove undefined keys
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);
      const changed = await db('money_donations').where({ id }).andWhere('temple_id', templeId).update(update);
      if (!changed) return res.status(404).json({ error: 'Not found' });
      const row = await db('money_donations').where({ id }).first();

      // Update corresponding journal entry if it exists
      try {
        const hasJournal = await db.schema.hasTable('journal_entries');
        if (hasJournal) {
          const existingJournalEntry = await db('journal_entries')
            .where({ 
              reference_type: 'money_donation', 
              reference_id: Number(id),
              temple_id: templeId 
            })
            .first();

          if (existingJournalEntry) {
            // Update the journal entry with new values
            const journalUpdate = {
              date: row.date,
              amount: row.amount,
              remarks: row.reason || null,
              to_account: row.transfer_to_account || 'INCOME A/C',
              updated_at: db.fn.now(),
            };

            await db('journal_entries')
              .where({ 
                reference_type: 'money_donation', 
                reference_id: Number(id),
                temple_id: templeId 
              })
              .update(journalUpdate);

            console.log('Successfully updated journal entry for money donation ID:', id);
          } else {
            // If no journal entry exists, create one (for backward compatibility)
            const fromAccount = 'DONATION A/C';
            const toAccount = row.transfer_to_account || 'INCOME A/C';
            
            await db('journal_entries').insert({
              date: row.date,
              from_account: fromAccount,
              to_account: toAccount,
              amount: row.amount,
              entry_type: 'transfer',
              remarks: row.reason || null,
              reference_type: 'money_donation',
              reference_id: row.id,
              temple_id: templeId,
              created_by: req.user.id,
              created_at: db.fn.now(),
            });

            console.log('Created missing journal entry for money donation ID:', id);
          }
        }
      } catch (journalError) {
        console.error('Failed to update journal entry for donation:', journalError);
        // Don't fail the main request, but log the error
      }

      // Log update with before/after
      try {
        await logMoneyDonationAction({
          donationId: id,
          templeId,
          userId: req.user.id,
          action: 'update',
          details: { before: beforeRow || null, after: row || null },
        });
        console.log('Successfully logged money donation update for ID:', id);
      } catch (logError) {
        console.error('Failed to log money donation update:', logError);
        // Don't fail the request if logging fails, but log the error
      }
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('Error updating /api/money-donations/:id:', err);
      res.status(500).json({ error: 'Failed to update money donation' });
    }
  });

  // Delete
  r.delete('/:id', authenticateToken, authorizePermission('edit_donations', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const templeId = req.user.templeId;
      const existing = await db('money_donations').where({ id }).andWhere('temple_id', templeId).first();
      if (!existing) return res.status(404).json({ error: 'Not found' });

      // Delete corresponding journal entry first
      try {
        const hasJournal = await db.schema.hasTable('journal_entries');
        if (hasJournal) {
          const deletedJournalEntries = await db('journal_entries')
            .where({ 
              reference_type: 'money_donation', 
              reference_id: Number(id),
              temple_id: templeId 
            })
            .del();

          if (deletedJournalEntries > 0) {
            console.log('Successfully deleted journal entry for money donation ID:', id);
          }
        }
      } catch (journalError) {
        console.error('Failed to delete journal entry for donation:', journalError);
        // Don't fail the main request, but log the error
      }

      const del = await db('money_donations').where({ id }).andWhere('temple_id', templeId).del();
      if (!del) return res.status(404).json({ error: 'Not found' });
      
      // Log deletion with snapshot
      try {
        await logMoneyDonationAction({
          donationId: id,
          templeId,
          userId: req.user.id,
          action: 'delete',
          details: existing || { id: Number(id) },
        });
        console.log('Successfully logged money donation deletion for ID:', id);
      } catch (logError) {
        console.error('Failed to log money donation deletion:', logError);
        // Don't fail the request if logging fails, but log the error
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting /api/money-donations/:id:', err);
      res.status(500).json({ error: 'Failed to delete money donation' });
    }
  });

  // Logs: per donation
  r.get('/:id/logs', authenticateToken, authorizePermission('view_donations', 'view'), async (req, res) => {
    try {
      const { id } = req.params;
      const templeId = req.user.templeId;
      const has = await db.schema.hasTable('money_donation_logs');
      if (!has) return res.json({ success: true, data: [] });
      const rows = await db('money_donation_logs')
        .where({ donation_id: Number(id), temple_id: templeId })
        .orderBy('created_at', 'desc')
        .select('*');
      const data = rows.map(r => ({
        id: r.id,
        action: r.action,
        created_at: r.created_at,
        created_by: r.created_by,
        details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
      }));
      res.json({ success: true, data });
    } catch (e) {
      console.error('Error fetching /api/money-donations/:id/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Logs: all logs for current temple
  r.get('/logs', authenticateToken, authorizePermission('view_donations', 'view'), async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
      const has = await db.schema.hasTable('money_donation_logs');
      if (!has) return res.json({ success: true, data: [], total: 0, page, pageSize });
      const base = db('money_donation_logs as l')
        .leftJoin('money_donations as d', 'd.id', 'l.donation_id')
        .where('l.temple_id', templeId);
      const totalRow = await base.clone().count({ c: '*' }).first();
      const total = Number(totalRow?.c || totalRow?.count || 0);
      const rows = await base.clone()
        .orderBy('l.created_at', 'desc')
        .orderBy('l.id', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .select('l.*', 'd.name as donation_name', 'd.register_no as register_no');
      const data = rows.map(r => ({
        id: r.id,
        donation_id: r.donation_id,
        action: r.action,
        created_at: r.created_at,
        created_by: r.created_by,
        donation_name: r.donation_name || null,
        register_no: r.register_no || null,
        details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
      }));
      res.json({ success: true, data, total, page, pageSize });
    } catch (e) {
      console.error('Error fetching /api/money-donations/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  app.use('/api/money-donations', r);
})();

// Main logs (unified feed) - aggregates multiple module logs for current temple
app.get('/api/main-logs', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const typeFilter = (req.query.type || '').toString().trim(); // 'tax' | 'donation' | ''
    const actionFilter = (req.query.action || '').toString().trim(); // 'create'|'update'|'delete'|''
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));

    const wantTax = !typeFilter || typeFilter === 'tax' || typeFilter === 'tax_registration';
    const wantDonation = !typeFilter || typeFilter === 'donation' || typeFilter === 'money_donation';

    // Fetch tax logs
    let taxRows = [];
    if (wantTax) {
      try {
        const has = await db.schema.hasTable('user_tax_registration_logs');
        if (has) {
          let q = db('user_tax_registration_logs as l')
            .leftJoin('user_tax_registrations as r', 'r.id', 'l.tax_registration_id')
            .where('l.temple_id', templeId)
            .select(
              'l.id', 'l.tax_registration_id', 'l.action', 'l.details', 'l.created_by', 'l.created_at',
              'r.name as context_name', 'r.reference_number as context_ref'
            );
          if (actionFilter) q = q.andWhere('l.action', actionFilter);
          taxRows = await q.orderBy('l.created_at', 'desc').orderBy('l.id', 'desc').limit(pageSize * 5);
        }
      } catch {}
    }

    // Fetch donation logs
    let donationRows = [];
    if (wantDonation) {
      try {
        const has = await db.schema.hasTable('money_donation_logs');
        if (has) {
          let q = db('money_donation_logs as l')
            .leftJoin('money_donations as d', 'd.id', 'l.donation_id')
            .where('l.temple_id', templeId)
            .select(
              'l.id', 'l.donation_id', 'l.action', 'l.details', 'l.created_by', 'l.created_at',
              'd.name as context_name', 'd.register_no as context_ref'
            );
          if (actionFilter) q = q.andWhere('l.action', actionFilter);
          donationRows = await q.orderBy('l.created_at', 'desc').orderBy('l.id', 'desc').limit(pageSize * 5);
        }
      } catch {}
    }

    // Normalize and merge
    const norm = [];
    if (wantTax) {
      for (const r of taxRows) {
        norm.push({
          type: 'tax_registration',
          id: `tax-${r.id}`,
          reference_id: r.tax_registration_id,
          action: r.action,
          created_at: r.created_at,
          created_by: r.created_by,
          context_name: r.context_name || null,
          context_ref: r.context_ref || null,
          details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
        });
      }
    }
    if (wantDonation) {
      for (const r of donationRows) {
        norm.push({
          type: 'money_donation',
          id: `don-${r.id}`,
          reference_id: r.donation_id,
          action: r.action,
          created_at: r.created_at,
          created_by: r.created_by,
          context_name: r.context_name || null,
          context_ref: r.context_ref || null,
          details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
        });
      }
    }

    // Sort and paginate in-memory (sufficient for moderate volumes)
    norm.sort((a, b) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      if (bt !== at) return bt - at;
      return String(b.id).localeCompare(String(a.id));
    });
    const total = norm.length;
    const start = (page - 1) * pageSize;
    const data = norm.slice(start, start + pageSize);

    res.json({ success: true, data, total, page, pageSize });
  } catch (e) {
    console.error('Error in /api/main-logs:', e);
    res.status(500).json({ error: 'Failed to fetch main logs' });
  }
});

// Middleware to verify JWT from query parameter for file downloads (e.g., PDFs opened via window.open)
function verifyQueryToken(req, res, next) {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Access denied. Invalid token.' });
      req.user = user;
      next();
    });
  } catch (e) {
    return res.status(401).json({ error: 'Access denied.' });
  }
}

// Mount external route for money donation receipt
try {
  const moneyDonationReceiptRouter = require('./routes/money-donation-receipt')({ db, verifyQueryToken });
  app.use(moneyDonationReceiptRouter);
} catch (e) {
  console.error('Failed to mount money donation receipt router:', e);
}

// Mount PDF settings API
try {
  const pdfSettingsRouter = require('./routes/pdf-settings')({ db, authenticateToken, authorizePermission });
  app.use('/api/pdf-settings', pdfSettingsRouter);
} catch (e) {
  console.error('Failed to mount PDF settings router:', e);
}

// Mount user settings API
try {
  const userSettingsRouter = require('./routes/user-settings')({ db, authenticateToken });
  app.use(userSettingsRouter);
} catch (e) {
  console.error('Failed to mount user settings router:', e);
}

// Mount tax registration receipt route (PDF)
try {
  const taxRegistrationReceiptRouter = require('./routes/tax-registration-receipt')({ db, verifyQueryToken });
  app.use(taxRegistrationReceiptRouter);
} catch (e) {
  console.error('Failed to mount tax registration receipt router:', e);
}

// Mount tax registrations CRUD (multipart create, list, export)
try {
  const taxRegistrationsRouter = require('./components/tax-registrations/index.js');
  app.use('/api/tax-registrations', taxRegistrationsRouter);
} catch (e) {
  console.error('Failed to mount tax registrations router:', e);
}

// Mount annadhanam receipt route (PDF)
try {
  const annadhanamReceiptRouter = require('./routes/annadhanam-receipt')({ db, verifyQueryToken });
  app.use(annadhanamReceiptRouter);
} catch (e) {
  console.error('Failed to mount annadhanam receipt router:', e);
}

// Mount hall booking receipt route (PDF)
try {
  const hallBookingReceiptRouter = require('./routes/hall-booking-receipt')({ db, verifyQueryToken });
  app.use(hallBookingReceiptRouter);
} catch (e) {
  console.error('Failed to mount hall booking receipt router:', e);
}

// Mount pooja receipt route (PDF)
try {
  const poojaReceiptRouter = require('./routes/pooja-receipt')({ db, verifyQueryToken });
  app.use(poojaReceiptRouter);
} catch (e) {
  console.error('Failed to mount pooja receipt router:', e);
}

// Backward-compatible categories router (no redirect)
const ledgerCategoriesCompat = (() => {
  const express = require('express');
  const router = express.Router();

  // GET /api/ledger-categories -> list categories
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const templeId = req.user.templeId || req.query.templeId || 1;
      const rows = await db('ledger_categories')
        .where('temple_id', templeId)
        .select('*')
        .orderBy('label', 'asc');
      const data = rows.map((r) => ({ id: r.id, value: r.value || r.label, label: r.label || r.value }));
      res.json(data);
    } catch (err) {
      console.error('Error fetching categories (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // POST /api/ledger-categories -> create category
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const { value, label, templeId } = req.body || {};
      const userTempleId = req.user.templeId || templeId || 1;
      
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });

      const exists = await db('ledger_categories')
        .where({ value, temple_id: userTempleId })
        .orWhere({ label, temple_id: userTempleId })
        .first();
      if (exists) return res.status(400).json({ error: 'Category already exists' });

      const [id] = await db('ledger_categories').insert({ 
        value, 
        label, 
        temple_id: userTempleId,
        created_at: db.fn.now() 
      });
      res.status(201).json({ id, value, label });
    } catch (err) {
      console.error('Error creating category (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // POST /api/ledger-categories/find-or-create
  router.post('/find-or-create', authenticateToken, async (req, res) => {
    try {
      const { value, label, templeId } = req.body || {};
      const userTempleId = req.user.templeId || templeId || 1;
      
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });

      const existing = await db('ledger_categories')
        .where({ value, temple_id: userTempleId })
        .orWhere({ label, temple_id: userTempleId })
        .first();
      if (existing) return res.json({ id: existing.id, value: existing.value, label: existing.label });

      const [id] = await db('ledger_categories').insert({ 
        value, 
        label, 
        temple_id: userTempleId,
        created_at: db.fn.now() 
      });
      res.status(201).json({ id, value, label });
    } catch (err) {
      console.error('Error find-or-create category (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // PUT /api/ledger-categories/:id -> mock update
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { value, label, templeId } = req.body || {};
      const userTempleId = req.user.templeId || templeId || 1;
      
      if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });
      
      // Check if category belongs to the user's temple
      const existing = await db('ledger_categories')
        .where({ id: Number(id), temple_id: userTempleId })
        .first();
      
      if (!existing) {
        return res.status(404).json({ error: 'Category not found or access denied' });
      }
      
      // In this simplified model, just return the updated object
      res.json({ id: Number(id), value, label });
    } catch (err) {
      console.error('Error updating category (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  // DELETE /api/ledger-categories/:id -> mock delete
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const templeId = req.user.templeId || req.query.templeId || 1;
      
      // Check if category belongs to the user's temple
      const existing = await db('ledger_categories')
        .where({ id: Number(id), temple_id: templeId })
        .first();
      
      if (!existing) {
        return res.status(404).json({ error: 'Category not found or access denied' });
      }
      
      // No-op in this simplified model
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting category (/api/ledger-categories):', err);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  return router;
})();

// Journal entries router
(() => {
  const express = require('express');
  const r = express.Router();

  // POST /api/journal/entries
  r.post('/entries', authenticateToken, authorizePermission('ledger_management', 'edit'), async (req, res) => {
    try {
      const b = req.body || {};
      const amount = Number(b.amount);
      if (!b.date) return res.status(400).json({ error: 'Date is required' });
      if (!b.from_account || !b.to_account) return res.status(400).json({ error: 'Both from_account and to_account are required' });
      // Allow zero amount; disallow negative or non-finite
      if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Amount cannot be negative' });

      // Normalize entry_type to MySQL ENUM set
      const allowedTypes = new Set(['transfer','receipt','payment','donation','adjustment']);
      let normalizedType = (b.entry_type || '').toString().toLowerCase();
      if (normalizedType === 'income' || normalizedType === 'credit') normalizedType = 'receipt';
      else if (normalizedType === 'expense' || normalizedType === 'debit') normalizedType = 'payment';
      if (!allowedTypes.has(normalizedType)) normalizedType = 'transfer';

      const entry = {
        date: b.date,
        from_account: b.from_account,
        to_account: b.to_account,
        amount,
        entry_type: normalizedType,
        remarks: b.remarks || null,
        reference_type: b.reference_type || null,
        reference_id: b.reference_id || null,
        temple_id: req.user.templeId,
        created_by: req.user.id,
        created_at: db.fn.now(),
      };
      const [id] = await db('journal_entries').insert(entry);
      const row = await db('journal_entries').where({ id }).first();
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('Error creating journal entry:', err);
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  });

  // GET /api/journal/accounts -> distinct account names
  r.get('/accounts', authenticateToken, authorizePermission('ledger_management', 'view'), async (req, res) => {
    try {
      const hasJournal = await db.schema.hasTable('journal_entries');
      let accounts = [];
      if (hasJournal) {
        const froms = await db('journal_entries').distinct('from_account as name').where('temple_id', req.user.templeId);
        const tos = await db('journal_entries').distinct('to_account as name').where('temple_id', req.user.templeId);
        const set = new Set();
        [...froms, ...tos].forEach(r => { if (r.name) set.add(r.name); });
        accounts = Array.from(set).sort().map(n => ({ name: n }));
      }
      // Fallback to ledger entries name/under if empty
      if (!accounts.length) {
        try {
          const rows = await db('ledger_entries').distinct('under as name').whereNotNull('under').andWhere('under', '!=', '');
          accounts = rows.map(r => ({ name: r.name }));
        } catch {}
      }
      res.json({ data: accounts });
    } catch (err) {
      console.error('Error fetching journal accounts:', err);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  // GET /api/journal/balance?account=NAME
  r.get('/balance', authenticateToken, authorizePermission('ledger_management', 'view'), async (req, res) => {
    try {
      const account = String(req.query.account || '').trim();
      if (!account) return res.status(400).json({ error: 'account is required' });
      const hasJournal = await db.schema.hasTable('journal_entries');
      if (!hasJournal) return res.json({ account, balance: 0 });
      const inflowRow = await db('journal_entries').where({ temple_id: req.user.templeId, to_account: account }).sum({ s: 'amount' }).first();
      const outflowRow = await db('journal_entries').where({ temple_id: req.user.templeId, from_account: account }).sum({ s: 'amount' }).first();
      const inflow = Number(inflowRow?.s || inflowRow?.sum || 0);
      const outflow = Number(outflowRow?.s || outflowRow?.sum || 0);
      const balanceRaw = inflow - outflow;
      const balance = Math.round((balanceRaw + Number.EPSILON) * 100) / 100;
      res.json({ account, balance });
    } catch (err) {
      console.error('Error computing balance:', err);
      res.status(500).json({ error: 'Failed to compute balance' });
    }
  });

  // GET /api/journal/entries (simple list with pagination)
  r.get('/entries', authenticateToken, authorizePermission('ledger_management', 'view'), async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit || req.query.pageSize) || 20;
      const offset = (page - 1) * limit;
      const base = db('journal_entries').where('temple_id', req.user.templeId);
      const countRow = await base.clone().count({ c: '*' }).first();
      const total = Number(countRow?.c || countRow?.count || 0);
      const rows = await base.clone().orderBy('date', 'desc').orderBy('id', 'desc').limit(limit).offset(offset);
      res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (err) {
      console.error('Error fetching journal entries:', err);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  // GET /api/journal/trial-balance
  // Computes per-account inflow (credits to the account) and outflow (debits from the account)
  // Groups accounts by their category if available
  r.get('/trial-balance', authenticateToken, authorizePermission('ledger_management', 'view'), async (req, res) => {
    try {
      const { from, to } = req.query;
      const base = db('journal_entries').where('journal_entries.temple_id', req.user.templeId);
      if (from) base.andWhere('journal_entries.date', '>=', String(from));
      if (to) base.andWhere('journal_entries.date', '<=', String(to));

      // Get all distinct accounts from both from_account and to_account
      const fromAccounts = await base
        .clone()
        .distinct('from_account as account')
        .whereNotNull('from_account')
        .where('from_account', '!=', '');
      
      const toAccounts = await base
        .clone()
        .distinct('to_account as account')
        .whereNotNull('to_account')
        .where('to_account', '!=', '');
      
      // Combine and deduplicate accounts
      const allAccounts = [...new Set([...fromAccounts, ...toAccounts].map(a => a.account))];
      
      // Get categories for all accounts
      const accountCategories = await db('ledger_entries')
        .distinct('under as category', 'name as account')
        .whereIn('name', allAccounts)
        .whereNotNull('under')
        .where('under', '!=', '');
      
      // Create a map of account to category
      const accountToCategory = new Map();
      accountCategories.forEach(ac => {
        if (ac.account && ac.category) {
          accountToCategory.set(ac.account, ac.category);
        }
      });

      // Aggregate inflow by to_account
      const inflows = await base
        .clone()
        .select('to_account as account')
        .sum({ inflow: 'amount' })
        .groupBy('to_account');

      // Aggregate outflow by from_account
      const outflows = await base
        .clone()
        .select('from_account as account')
        .sum({ outflow: 'amount' })
        .groupBy('from_account');

      const map = new Map();
      inflows.forEach((r) => {
        const k = r.account || '';
        if (!k) return;
        const prev = map.get(k) || { account: k, category: accountToCategory.get(k) || 'Uncategorized', inflow: 0, outflow: 0 };
        prev.inflow += Number(r.inflow || r.sum || 0);
        map.set(k, prev);
      });
      outflows.forEach((r) => {
        const k = r.account || '';
        if (!k) return;
        const prev = map.get(k) || { account: k, category: accountToCategory.get(k) || 'Uncategorized', inflow: 0, outflow: 0 };
        prev.outflow += Number(r.outflow || r.sum || 0);
        map.set(k, prev);
      });

      // Convert map to array and calculate balances
      const rows = Array.from(map.values()).map((r) => {
        const net = (r.inflow || 0) - (r.outflow || 0);
        return {
          account: r.account,
          category: r.category,
          inflow: Number(r.inflow || 0),
          outflow: Number(r.outflow || 0),
          balance: Math.round((net + Number.EPSILON) * 100) / 100,
          debit: net < 0 ? Math.round((Math.abs(net) + Number.EPSILON) * 100) / 100 : 0,
          credit: net > 0 ? Math.round((net + Number.EPSILON) * 100) / 100 : 0,
        };
      });

      // Group by category
      const categories = {};
      rows.forEach(row => {
        const category = row.category || 'Uncategorized';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(row);
      });

      // Calculate category totals
      const categoryTotals = {};
      Object.entries(categories).forEach(([category, items]) => {
        categoryTotals[category] = items.reduce((acc, item) => {
          acc.debit += item.debit;
          acc.credit += item.credit;
          return acc;
        }, { debit: 0, credit: 0 });
      });

      // Calculate grand totals
      const totals = {
        debit: Object.values(categoryTotals).reduce((sum, cat) => sum + cat.debit, 0),
        credit: Object.values(categoryTotals).reduce((sum, cat) => sum + cat.credit, 0)
      };

      res.json({ 
        success: true, 
        data: categories, 
        categoryTotals,
        totals,
        allRows: rows // Keep flat list for backward compatibility
      });
    } catch (err) {
      console.error('Error computing trial balance:', err);
      res.status(500).json({ error: 'Failed to compute trial balance' });
    }
  });

  // GET /api/journal/trial-balance.pdf
  // Same data as JSON, rendered as a simple PDF table. Token expected in query (?token=)
  r.get('/trial-balance.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { from, to } = req.query;
      const base = db('journal_entries').where('temple_id', req.user.templeId);
      if (from) base.andWhere('date', '>=', String(from));
      if (to) base.andWhere('date', '<=', String(to));

      const inflows = await base.clone().select('to_account as account').sum({ inflow: 'amount' }).groupBy('to_account');
      const outflows = await base.clone().select('from_account as account').sum({ outflow: 'amount' }).groupBy('from_account');

      const map = new Map();
      inflows.forEach((r) => {
        const k = r.account || '';
        if (!k) return;
        const prev = map.get(k) || { account: k, inflow: 0, outflow: 0 };
        prev.inflow += Number(r.inflow || r.sum || 0);
        map.set(k, prev);
      });
      outflows.forEach((r) => {
        const k = r.account || '';
        if (!k) return;
        const prev = map.get(k) || { account: k, inflow: 0, outflow: 0 };
        prev.outflow += Number(r.outflow || r.sum || 0);
        map.set(k, prev);
      });

      const rows = Array.from(map.values()).map((r) => {
        const net = (r.inflow || 0) - (r.outflow || 0);
        return {
          account: r.account,
          inflow: Number(r.inflow || 0),
          outflow: Number(r.outflow || 0),
          balance: Math.round((net + Number.EPSILON) * 100) / 100,
          debit: net < 0 ? Math.round((Math.abs(net) + Number.EPSILON) * 100) / 100 : 0,
          credit: net > 0 ? Math.round((net + Number.EPSILON) * 100) / 100 : 0,
        };
      }).sort((a, b) => a.account.localeCompare(b.account));

      const totals = rows.reduce((acc, r) => { acc.debit += r.debit; acc.credit += r.credit; return acc; }, { debit: 0, credit: 0 });
      totals.debit = Math.round((totals.debit + Number.EPSILON) * 100) / 100;
      totals.credit = Math.round((totals.credit + Number.EPSILON) * 100) / 100;

      // Create PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="trial-balance_${from || 'start'}_${to || 'end'}.pdf"`);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      doc.pipe(res);

      doc.fontSize(16).text('Trial Balance', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Temple ID: ${req.user.templeId}   Range: ${from || '-'} to ${to || '-'}`, { align: 'center' });
      doc.moveDown();

      const headers = ['Account', 'Inflow', 'Outflow', 'Debit', 'Credit', 'Balance'];
      const colWidths = [180, 70, 70, 70, 70, 70];
      const startX = doc.x;
      let y = doc.y;

      const drawRow = (vals, bold = false) => {
        let x = startX;
        vals.forEach((v, i) => {
          doc.fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica');
          const isNum = i > 0;
          const txt = typeof v === 'number' ? v.toFixed(2) : String(v);
          doc.text(txt, x + 2, y, { width: colWidths[i] - 4, align: isNum ? 'right' : 'left' });
          x += colWidths[i];
        });
        y += 18;
        if (y > doc.page.height - 60) { doc.addPage(); y = doc.y; }
      };

      // Header
      drawRow(headers, true);
      // Divider
      doc.moveTo(startX, y - 4).lineTo(startX + colWidths.reduce((a,b)=>a+b,0), y - 4).strokeColor('#999').stroke();

      // Body
      rows.forEach(r => drawRow([r.account, r.inflow, r.outflow, r.debit, r.credit, r.balance]));

      // Totals
      doc.moveDown(0.5);
      drawRow(['Total', '', '', totals.debit, totals.credit, rows.reduce((s, r) => s + r.balance, 0)], true);

      doc.end();
    } catch (err) {
      console.error('Error generating trial balance PDF:', err);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  // GET /api/journal/balance-sheet
  // Heuristic grouping using only net sign (no chart of accounts):
  // assets = accounts with positive balance; liabilities = accounts with negative balance
  r.get('/balance-sheet', authenticateToken, authorizePermission('ledger_management', 'view'), async (req, res) => {
    try {
      const { from, to } = req.query;
      const base = db('journal_entries').where('temple_id', req.user.templeId);
      if (from) base.andWhere('date', '>=', String(from));
      if (to) base.andWhere('date', '<=', String(to));

      const inflows = await base
        .clone()
        .select('to_account as account')
        .sum({ inflow: 'amount' })
        .groupBy('to_account');

      const outflows = await base
        .clone()
        .select('from_account as account')
        .sum({ outflow: 'amount' })
        .groupBy('from_account');

      const map = new Map();
      inflows.forEach((r) => {
        const k = r.account || '';
        if (!k) return;
        const prev = map.get(k) || { account: k, inflow: 0, outflow: 0 };
        prev.inflow += Number(r.inflow || r.sum || 0);
        map.set(k, prev);
      });
      outflows.forEach((r) => {
        const k = r.account || '';
        if (!k) return;
        const prev = map.get(k) || { account: k, inflow: 0, outflow: 0 };
        prev.outflow += Number(r.outflow || r.sum || 0);
        map.set(k, prev);
      });

      const assets = [];
      const liabilities = [];
      Array.from(map.values()).forEach((r) => {
        const net = (r.inflow || 0) - (r.outflow || 0);
        const item = {
          account: r.account,
          balance: Math.round((net + Number.EPSILON) * 100) / 100,
        };
        if (net >= 0) assets.push(item); else liabilities.push({ account: r.account, balance: Math.round((Math.abs(net) + Number.EPSILON) * 100) / 100 });
      });

      const sum = (list) => Math.round((list.reduce((s, x) => s + (x.balance || 0), 0) + Number.EPSILON) * 100) / 100;
      const totalAssets = sum(assets);
      const totalLiabilities = sum(liabilities);

      res.json({ success: true, data: { assets, liabilities, totals: { assets: totalAssets, liabilities: totalLiabilities } } });
    } catch (err) {
      console.error('Error computing balance sheet:', err);
      res.status(500).json({ error: 'Failed to compute balance sheet' });
    }
  });

  app.use('/api/journal', r);
})();

// Function to generate the next receipt number in format YYYY-XXXX
async function generateReceiptNumber(db, templeId) {
  const year = new Date().getFullYear();
  
  // Get the latest receipt number for this year and temple
  const latest = await db('receipts')
    .where('temple_id', templeId)
    .where('register_no', 'like', `${year}-%`)
    .orderBy('id', 'desc')
    .first();

  let nextNumber = 1;
  
  if (latest && latest.register_no) {
    const parts = latest.register_no.split('-');
    if (parts.length === 2 && parts[0] === year.toString()) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }
  
  // Format with leading zeros
  return `${year}-${String(nextNumber).padStart(4, '0')}`;
}

// Next receipt number from DB (format YYYY-XXXX)
app.get('/api/receipts/next-number', authenticateToken, authorizePermission('receipts', 'view'), async (req, res) => {
  try {
    const nextNumber = await generateReceiptNumber(db, req.user.templeId);
    res.json({ success: true, data: { nextNumber } });
  } catch (err) {
    console.error('Error computing next receipt number:', err);
    res.status(500).json({ error: 'Failed to compute next receipt number' });
  }
});

// Create receipt
app.post('/api/receipts', authenticateToken, authorizePermission('receipts', 'edit'), async (req, res) => {
  try {
    const b = req.body || {};
    const type = b.type === 'expense' ? 'payment' : 'receipt';
    const amount = Number(b.amount);
    if (!b.date) return res.status(400).json({ error: 'Date is required' });
    if (!amount || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });
    const receiptNumber = await generateReceiptNumber(db, req.user.templeId);
    const payload = {
      register_no: receiptNumber,
      date: b.date,
      type,
      from_person: b.donor || '',
      to_person: b.receiver || '',
      amount,
      remarks: b.remarks || '',
      created_by: req.user.id,
      temple_id: req.user.templeId,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };
    const [id] = await db('receipts').insert(payload);
    const row = await db('receipts').where({ id }).first();
    // Reflect into journal so balances are accurate
    try {
      const isExpense = row.type === 'payment';
      const fromAccount = isExpense ? (row.from_person || 'CASH A/C') : (row.from_person || 'INCOME A/C');
      const toAccount = isExpense ? (row.to_person || 'EXPENSE A/C') : (row.to_person || 'CASH A/C');
      const hasJournal = await db.schema.hasTable('journal_entries');
      if (hasJournal) {
        const existing = await db('journal_entries')
          .where({ reference_type: 'receipt', reference_id: row.id, temple_id: req.user.templeId })
          .first();
        if (!existing) {
          await db('journal_entries').insert({
            date: row.date,
            from_account: fromAccount,
            to_account: toAccount,
            amount: row.amount,
            // Use 'transfer' to satisfy DB CHECK constraint reliably
            entry_type: 'transfer',
            remarks: row.remarks || null,
            reference_type: 'receipt',
            reference_id: row.id,
            temple_id: req.user.templeId,
            created_by: req.user.id,
            created_at: db.fn.now(),
          });
        }
      }
    } catch (e) {
      console.error('Failed to mirror receipt into journal_entries:', e);
      // don't fail the main response
    }
    // Log creation
    try {
      await logReceiptAction({
        receiptId: row.id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'create',
        details: row || payload,
      });
    } catch (_) {}
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('Error creating receipt:', err);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
});

// Read receipt
app.get('/api/receipts/:id', authenticateToken, authorizePermission('receipts', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).first();
    if (!row) return res.status(404).json({ success: false, error: 'Receipt not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch receipt' });
  }
});

// Update receipt
app.put('/api/receipts/:id', authenticateToken, authorizePermission('receipts', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const beforeRow = await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).first();
    const update = {
      register_no: b.receiptNumber,
      date: b.date,
      type: b.type ? (b.type === 'expense' ? 'payment' : 'receipt') : undefined,
      from_person: b.donor,
      to_person: b.receiver,
      amount: b.amount != null ? Number(b.amount) : undefined,
      remarks: b.remarks,
      updated_at: db.fn.now(),
    };
    // strip undefineds
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);
    const changed = await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).update(update);
    if (!changed) return res.status(404).json({ success: false, error: 'Receipt not found' });
    const row = await db('receipts').where({ id }).first();
    try {
      await logReceiptAction({
        receiptId: row.id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'update',
        details: { before: beforeRow || null, after: row || null },
      });
    } catch (_) {}
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('Error updating receipt:', err);
    res.status(500).json({ success: false, error: 'Failed to update receipt' });
  }
});

// List receipts with filters
app.get('/api/receipts', authenticateToken, authorizePermission('receipts', 'view'), async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit || req.query.pageSize) || 20;
    const offset = (page - 1) * limit;

    const { q, from, to } = req.query;
    const typeParam = req.query.type; // 'income' | 'expense' (from UI)
    const dbType = typeParam === 'income' ? 'receipt' : typeParam === 'expense' ? 'payment' : undefined;

    let base = db('receipts').where('temple_id', req.user.templeId);
    if (from) base = base.andWhere('date', '>=', String(from));
    if (to) base = base.andWhere('date', '<=', String(to));
    if (dbType) base = base.andWhere('type', dbType);
    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`;
      base = base.andWhere(function () {
        this.where('register_no', 'like', term)
          .orWhere('from_person', 'like', term)
          .orWhere('to_person', 'like', term)
          .orWhere('remarks', 'like', term);
      });
    }

    const countRow = await base.clone().count({ c: '*' }).first();
    const total = Number(countRow?.c || countRow?.count || 0);

    const rows = await base
      .clone()
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    console.error('Error listing receipts:', err);
    res.status(500).json({ success: false, error: 'Failed to list receipts' });
  }
});

// Delete
app.delete('/api/receipts/:id', authenticateToken, authorizePermission('receipts', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).first();
    // Delete receipt and any mirrored journal entries
    const del = await db('receipts').where({ id }).andWhere('temple_id', req.user.templeId).del();
    if (!del) return res.status(404).json({ error: 'Receipt not found' });
    try {
      const hasJournal = await db.schema.hasTable('journal_entries');
      if (hasJournal) {
        await db('journal_entries')
          .where({ reference_type: 'receipt', reference_id: Number(id), temple_id: req.user.templeId })
          .del();
      }
    } catch (e) {
      console.warn('Failed to cleanup mirrored journal for receipt', id, e);
    }
    try {
      await logReceiptAction({
        receiptId: Number(id),
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'delete',
        details: existing || { id: Number(id) },
      });
    } catch (_) {}
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting receipt:', err);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// Receipt logs: fetch logs for a specific receipt
app.get('/api/receipts/:id/logs', authenticateToken, authorizePermission('receipts', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;
    const has = await db.schema.hasTable('receipt_logs');
    if (!has) return res.json({ success: true, data: [] });
    const rows = await db('receipt_logs')
      .where({ receipt_id: Number(id), temple_id: templeId })
      .orderBy('created_at', 'desc')
      .select('*');
    const data = rows.map(r => ({
      id: r.id,
      temple_id: r.temple_id,
      receipt_id: r.receipt_id,
      action: r.action,
      details: r.details ? (() => { try { return JSON.parse(r.details); } catch { return r.details; } })() : null,
      created_by: r.created_by,
      created_at: r.created_at,
    }));
    res.json({ success: true, data });
  } catch (e) {
    console.error('Error fetching /api/receipts/:id/logs:', e);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Receipt logs: paginated logs list for current temple
app.get('/api/receipts/logs', authenticateToken, authorizePermission('receipts', 'view'), async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    const has = await db.schema.hasTable('receipt_logs');
    if (!has) return res.json({ success: true, data: [], total: 0, page, pageSize });
    const base = db('receipt_logs as l')
      .leftJoin('receipts as r', 'r.id', 'l.receipt_id')
      .where('l.temple_id', templeId);
    const totalRow = await base.clone().count({ c: '*' }).first();
    const total = Number(totalRow?.c || totalRow?.count || 0);
    const rows = await base
      .clone()
      .orderBy('l.created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .select('l.*', 'r.register_no', 'r.date', 'r.amount', 'r.type');
    const data = rows.map(r => ({
      id: r.id,
      temple_id: r.temple_id,
      receipt_id: r.receipt_id,
      action: r.action,
      details: r.details ? (() => { try { return JSON.parse(r.details); } catch { return r.details; } })() : null,
      created_by: r.created_by,
      created_at: r.created_at,
      register_no: r.register_no,
      date: r.date,
      amount: r.amount,
      type: r.type,
    }));
    res.json({ success: true, data, total, page, pageSize });
  } catch (e) {
    console.error('Error fetching /api/receipts/logs:', e);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Reports: Daily aggregation
app.get('/api/reports/daily', authenticateToken, async (req, res) => {
  try {
    const date = (req.query.date || new Date().toISOString().slice(0,10)).toString();
    const templeId = req.user.templeId;

    // Receipts
    const [receiptsIncomeRow] = await db('receipts')
      .where({ temple_id: templeId })
      .andWhere('date', date)
      .andWhere('type', 'receipt')
      .sum({ sum: 'amount' });
    const [receiptsExpenseRow] = await db('receipts')
      .where({ temple_id: templeId })
      .andWhere('date', date)
      .andWhere('type', 'payment')
      .sum({ sum: 'amount' });

    // Money donations
    const [donationsRow] = await db('money_donations')
      .where({ temple_id: templeId })
      .andWhere('date', date)
      .sum({ sum: 'amount' });

    // Pooja amounts where the selected date falls within the booking range
    const [poojaRow] = await db('pooja')
      .where({ temple_id: templeId })
      .andWhere('from_date', '<=', date)
      .andWhere('to_date', '>=', date)
      .sum({ sum: 'amount' });

    // Hall bookings: count advance amounts collected on the booking date
    const [hallAdvanceRow] = await db('marriage_hall_bookings')
      .where({ temple_id: templeId })
      .andWhere('date', date)
      .sum({ sum: 'advance_amount' });

    // Tax registrations: include amount paid collected on the given date
    let taxRow = { sum: 0 };
    try {
      [taxRow] = await db('user_tax_registrations')
        .where({ temple_id: templeId })
        .andWhere('date', date)
        .sum({ sum: 'amount_paid' });
    } catch (e) {
      taxRow = { sum: 0 };
    }

    const toNum = (v) => {
      const n = Number(v?.sum ?? v ?? 0);
      return Number.isFinite(n) ? n : 0;
    };

    const income = {
      receipts_income_total: toNum(receiptsIncomeRow),
      donations_total: toNum(donationsRow),
      pooja_total: toNum(poojaRow),
      hall_advance_total: toNum(hallAdvanceRow),
      tax_total: toNum(taxRow),
    };

    const expenses = {
      receipts_expense_total: toNum(receiptsExpenseRow),
    };

    const grand_total_income = Object.values(income).reduce((a, b) => a + b, 0);
    const grand_total_expense = Object.values(expenses).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      date,
      data: {
        breakdown: {
          income,
          expenses,
        },
        totals: {
          grand_total_income,
          grand_total_expense,
          net: grand_total_income - grand_total_expense,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/reports/daily error:', err);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

// Reports: Monthly aggregation (year=YYYY, month=MM 1-12)
app.get('/api/reports/monthly', authenticateToken, authorizePermission('reports', 'view'), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
    const templeId = req.user.templeId;

    const pad = (n) => String(n).padStart(2, '0');
    const from = `${year}-${pad(month)}-01`;
    // Compute last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${pad(month)}-${pad(lastDay)}`;

    // Receipts
    const [receiptsIncomeRow] = await db('receipts')
      .where({ temple_id: templeId })
      .andWhere('date', '>=', from)
      .andWhere('date', '<=', to)
      .andWhere('type', 'receipt')
      .sum({ sum: 'amount' });
    const [receiptsExpenseRow] = await db('receipts')
      .where({ temple_id: templeId })
      .andWhere('date', '>=', from)
      .andWhere('date', '<=', to)
      .andWhere('type', 'payment')
      .sum({ sum: 'amount' });

    // Money donations
    const [donationsRow] = await db('money_donations')
      .where({ temple_id: templeId })
      .andWhere('date', '>=', from)
      .andWhere('date', '<=', to)
      .sum({ sum: 'amount' });

    // Pooja amounts overlapping the month
    const [poojaRow] = await db('pooja')
      .where({ temple_id: templeId })
      .andWhere('from_date', '<=', to)
      .andWhere('to_date', '>=', from)
      .sum({ sum: 'amount' });

    // Hall bookings: sum advance collected within the month
    const [hallAdvanceRow] = await db('marriage_hall_bookings')
      .where({ temple_id: templeId })
      .andWhere('date', '>=', from)
      .andWhere('date', '<=', to)
      .sum({ sum: 'advance_amount' });

    // Tax registrations: sum amount_paid within the month
    let taxRow = { sum: 0 };
    try {
      [taxRow] = await db('user_tax_registrations')
        .where({ temple_id: templeId })
        .andWhere('date', '>=', from)
        .andWhere('date', '<=', to)
        .sum({ sum: 'amount_paid' });
    } catch (e) {
      taxRow = { sum: 0 };
    }

    const toNum = (v) => {
      const n = Number(v?.sum ?? v ?? 0);
      return Number.isFinite(n) ? n : 0;
    };

    const income = {
      receipts_income_total: toNum(receiptsIncomeRow),
      donations_total: toNum(donationsRow),
      pooja_total: toNum(poojaRow),
      hall_advance_total: toNum(hallAdvanceRow),
      tax_total: toNum(taxRow),
    };
    const expenses = {
      receipts_expense_total: toNum(receiptsExpenseRow),
    };

    const grand_total_income = Object.values(income).reduce((a, b) => a + b, 0);
    const grand_total_expense = Object.values(expenses).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      range: { from, to },
      data: {
        breakdown: { income, expenses },
        totals: {
          grand_total_income,
          grand_total_expense,
          net: grand_total_income - grand_total_expense,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/reports/monthly error:', err);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// Dashboard stats: total members, paid this month, unpaid this month
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const pad = (n) => String(n).padStart(2, '0');
    const from = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${pad(month)}-${pad(lastDay)}`;

    // Total members (registrations) for temple
    const [{ count: totalCountRaw }] = await db('user_registrations')
      .where('temple_id', templeId)
      .count({ count: '*' });
    const totalMembers = Number(totalCountRaw || 0);

    // Paid members this month: distinct register_no in receipts with type='receipt' in month
    // Assumption: receipts.register_no maps to user_registrations.reference_number
    const paidRows = await db('receipts')
      .where({ temple_id: templeId })
      .andWhere('type', 'receipt')
      .andWhere('date', '>=', from)
      .andWhere('date', '<=', to)
      .distinct('register_no as reg');
    const paidMembersThisMonth = paidRows.filter(r => r.reg != null && String(r.reg).trim() !== '').length;

    const unpaidMembersThisMonth = Math.max(0, totalMembers - paidMembersThisMonth);

    res.json({
      success: true,
      range: { from, to },
      data: {
        totalMembers,
        paidMembersThisMonth,
        unpaidMembersThisMonth,
      }
    });
  } catch (err) {
    console.error('GET /api/dashboard/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Migrate tables if not exist
async function migrate() {
  try {
    console.log('Starting database migration...');
    // ... (rest of the code remains the same)
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

      // Continue with other table creations below...
    }

    // Ensure users.email allows NULL (email is optional but must be UNIQUE when present)
    try {
      const cols = await db.raw(`PRAGMA table_info('users')`);
      const emailCol = (cols?.[0] || cols).find?.(c => c.name === 'email');
      if (emailCol && emailCol.notnull === 1) {
        console.log('Migrating users table to allow NULL emails (keeping UNIQUE constraint)');
        await db.transaction(async trx => {
          // Create new table with email nullable
          await trx.schema.createTable('users_new', (table) => {
            table.increments('id').primary();
            table.string('username').notNullable().unique();
            table.string('email').unique().nullable();
            table.string('full_name');
            table.string('mobile').notNullable().unique();
            table.string('password').notNullable();
            table.string('role').notNullable().defaultTo('member');
            table.integer('temple_id').notNullable();
            table.string('status').notNullable().defaultTo('active');
            table.timestamp('created_at').defaultTo(trx.fn.now());
            table.timestamp('updated_at').defaultTo(trx.fn.now());
          });

          // Copy data; convert empty emails to NULL
          const rows = await trx('users').select('*');
          for (const r of rows) {
            await trx('users_new').insert({
              id: r.id,
              username: r.username,
              email: r.email && String(r.email).trim() !== '' ? r.email : null,
              full_name: r.full_name,
              mobile: r.mobile,
              password: r.password,
              role: r.role,
              temple_id: r.temple_id,
              status: r.status,
              created_at: r.created_at,
              updated_at: r.updated_at,
            });
          }

          // Replace old table
          await trx.schema.dropTable('users');
          await trx.schema.renameTable('users_new', 'users');

          // Recreate foreign keys if necessary (SQLite limitations)
          // Note: If there are FKs referencing users.id, they remain valid by table rename.
          console.log('Users table migrated successfully.');
        });
      }
    } catch (e) {
      console.warn('Users email NULL migration skipped or failed:', e.message);
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

      // Add pdf_settings permission if it doesn't exist
      await db.raw(`
        INSERT OR IGNORE INTO permissions (id, name, description)
        VALUES ('pdf_settings', 'PDF Settings', 'Manage receipt PDF titles and logo')
        VALUES ('pdf_settings', 'PDF Settings', 'Manage receipt PDF titles and logo');
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

    // Import and run pdf_settings table migration
    const createPdfSettingsTable = require('./db/migrations/createPdfSettingsTable');
    await createPdfSettingsTable(db);

    // Import and run tax_settings table migration
    const createTaxSettingsTable = require('./db/migrations/createTaxSettingsTable');
    await createTaxSettingsTable(db);

    // Import and run user_settings table migration
    const createUserSettingsTable = require('./db/migrations/createUserSettingsTable');
    await createUserSettingsTable(db);

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

    // Import and run master_halls and master_hall_events table migrations
    try {
      const createMasterHallsTable = require('./db/migrations/createMasterHallsTable');
      await createMasterHallsTable(db);
    } catch (e) { console.warn('createMasterHallsTable migration failed:', e.message); }
    try {
      const createMasterHallEventsTable = require('./db/migrations/createMasterHallEventsTable');
      await createMasterHallEventsTable(db);
    } catch (e) { console.warn('createMasterHallEventsTable migration failed:', e.message); }

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
    
    // Create external temple databases registry (for superadmin cross-tenant monitoring)
    if (!(await db.schema.hasTable('external_temple_databases'))) {
      await db.schema.createTable('external_temple_databases', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('db_path').notNullable();
        table.string('status').notNullable().defaultTo('active'); // active/inactive
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created external_temple_databases table.');
    }
    
    // Create simple key-value system settings table
    if (!(await db.schema.hasTable('system_settings'))) {
      await db.schema.createTable('system_settings', (table) => {
        table.string('key').primary();
        table.text('value');
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created system_settings table.');
    }
    // Seed default year-end flags if missing
    const ensureSetting = async (key, defaultValue) => {
      const row = await db('system_settings').where({ key }).first();
      if (!row) {
        await db('system_settings').insert({ key, value: JSON.stringify(defaultValue), updated_at: db.fn.now() });
      }
    };
    await ensureSetting('year_end_enforced', false);
    await ensureSetting('year_end_locked', false);
    
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
    
    // Run ledger categories temple_id migration
    try {
      const addTempleIdToLedgerCategories = require('./db/migrations/addTempleIdToLedgerCategories');
      await addTempleIdToLedgerCategories(db);
      console.log('Ledger categories temple_id migration completed.');
    } catch (migrationErr) {
      console.log('Ledger categories temple_id migration skipped or failed:', migrationErr.message);
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

    // Add transfer_to_account for ledger account mapping
    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN transfer_to_account TEXT');
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Add hall_id and event_id references to master tables (nullable for backward compat)
    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN hall_id INTEGER');
    } catch (err) { /* ignore if exists */ }
    try {
      await db.raw('ALTER TABLE marriage_hall_bookings ADD COLUMN event_id INTEGER');
    } catch (err) { /* ignore if exists */ }

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

    // Ensure ledger_categories table exists (for Manage Categories)
    if (!(await db.schema.hasTable('ledger_categories'))) {
      await db.schema.createTable('ledger_categories', (table) => {
        table.increments('id').primary();
        table.string('value').notNullable();
        table.string('label').notNullable();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at');
        table.unique(['value', 'temple_id']);
        table.unique(['label', 'temple_id']);
      });
      console.log('Created ledger_categories table.');
    } else {
      // Add temple_id column if it doesn't exist
      try {
        const cols = await db.raw("PRAGMA table_info(ledger_categories)");
        const colNames = cols.map(c => c.name);
        if (!colNames.includes('temple_id')) {
          await db.raw('ALTER TABLE ledger_categories ADD COLUMN temple_id INTEGER NOT NULL DEFAULT 1');
          console.log('Added temple_id column to ledger_categories table.');
        }
      } catch (e) {
        console.log('Note: Could not alter ledger_categories for temple_id:', e.message);
      }
    }

    // Seed ledger_categories from existing ledger_entries.under (idempotent)
    try {
      // Get distinct temple_ids from ledger_entries
      const templeRows = await db('ledger_entries')
        .distinct('temple_id')
        .whereNotNull('temple_id');
      
      for (const templeRow of templeRows) {
        const templeId = templeRow.temple_id;
        
        // Get existing values for this temple
        const existingValues = new Set(
          (await db('ledger_categories')
            .where('temple_id', templeId)
            .select('value'))
            .map(r => r.value)
        );
        
        // Get distinct 'under' values for this temple
        const underRows = await db('ledger_entries')
          .where('temple_id', templeId)
          .whereNotNull('under')
          .distinct({ value: 'under' })
          .orderBy('under', 'asc');
          
        const toInsert = underRows
          .map(r => ({ value: r.value, label: r.value, temple_id: templeId }))
          .filter(r => r.value && !existingValues.has(r.value));
          
        if (toInsert.length > 0) {
          await db('ledger_categories').insert(
            toInsert.map(r => ({ ...r, created_at: db.fn.now() }))
          );
          console.log(`Seeded ${toInsert.length} categories for temple ${templeId} from ledger_entries.`);
        }
      }
    } catch (seedErr) {
      console.log('Seeding ledger_categories skipped or failed:', seedErr.message);
    }

    // Ensure donation_products table exists
    if (!(await db.schema.hasTable('donation_products'))) {
      await db.schema.createTable('donation_products', (table) => {
        table.increments('id').primary();
        table.string('value').notNullable();
        table.string('label').notNullable();
        table.string('unit');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at');
        table.unique(['value']);
        table.unique(['label']);
      });
      console.log('Created donation_products table.');
    }

    // Ensure money_donations table exists
    if (!(await db.schema.hasTable('money_donations'))) {
      await db.schema.createTable('money_donations', (table) => {
        table.increments('id').primary();
        table.string('register_no');
        table.string('date').notNullable();
        table.string('name');
        table.string('father_name');
        table.string('address');
        table.string('village');
        table.string('phone');
        table.float('amount').notNullable();
        table.string('reason');
        table.integer('temple_id').notNullable().defaultTo(1);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created money_donations table.');
    }
    // Safe column additions for money_donations table
    try { await db.raw('ALTER TABLE money_donations ADD COLUMN transfer_to_account TEXT'); } catch (e) {}

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

    // Add permissions for annadhanam approval system
    await db.raw(`
      INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
      ('annadhanam_approval', 'Annadhanam Approval', 'Approve or reject annadhanam requests from mobile users'),
      ('annadhanam_mobile_submit', 'Annadhanam Mobile Submit', 'Submit annadhanam requests from mobile app')
    `);

    // Grant permissions to roles
    await db.raw(`
      INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level) VALUES
      ('admin', 'annadhanam_approval', 'full'),
      ('superadmin', 'annadhanam_approval', 'full'),
      ('member', 'annadhanam_mobile_submit', 'full')
    `);

    // Grant specific permission to user with mobile 9999999999
    await db.raw(`
      INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
      SELECT u.id, 'annadhanam_mobile_submit', 'full'
      FROM users u
      WHERE u.mobile = '9999999999'
      AND NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = u.id AND up.permission_id = 'annadhanam_mobile_submit'
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

// Mount users router (provides /api/login for username/mobile + password, and protects other user routes)
try {
  const usersRouter = require('./users')({ db, JWT_SECRET, authenticateToken: authenticateToken });
  app.use('/api', usersRouter);
} catch (e) {
  console.error('Failed to mount users router:', e);
}

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
      { id: 'pdf_settings', label: 'PDF Settings', description: 'Manage receipt PDF titles and logo' },
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
app.use('/api/master', authenticateToken, authorizeRole(['admin','superadmin']), masterDataRouter);

// Master clans delete route has been moved to /api/master/clans/:id


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
      
      const safeEmail = email && String(email).trim() !== '' ? String(email).trim() : null;
      
      const newMember = await db.transaction(async trx => {
        console.log('Creating member record with data:', {
          name,
          username,
          mobile_number: mobile,
          email: safeEmail,
          temple_id: req.user.templeId
        });
        
        // Create member record
        const [member] = await trx('user_registrations')
          .insert({
            name,
            username,
            mobile_number: mobile,
            email: safeEmail,
            temple_id: req.user.templeId,
            created_at: db.fn.now()
          })
          .returning('*');
        
        // Create login if requested
        if (createLogin) {
          // Ensure required permissions exist in the database
          const requiredPermissions = [
            { id: 'dashboard', name: 'Dashboard', description: 'Access to dashboard' },
            { id: 'member_entry', name: 'Member Entry', description: 'Add and manage members' },
            { id: 'master_data', name: 'Master Data', description: 'Manage master data' },
            { id: 'ledger_management', name: 'Ledger Management', description: 'Manage ledger entries' },
            { id: 'reports', name: 'Reports', description: 'View reports' },
            { id: 'balance_sheet', name: 'Balance Sheet', description: 'View balance sheet' },
            { id: 'setting', name: 'Settings', description: 'Manage settings' },
            { id: 'pdf_settings', name: 'PDF Settings', description: 'Manage PDF settings' },
            { id: 'user_registrations', name: 'User Registrations', description: 'Manage user registrations' },
            { id: 'tax_registrations', name: 'Tax Registrations', description: 'Manage tax registrations' },
            { id: 'property_registrations', name: 'Property Registrations', description: 'Manage property registrations' },
            { id: 'view_donations', name: 'View Donations', description: 'View donation records' },
            { id: 'edit_donations', name: 'Edit Donations', description: 'Edit donation records' },
            { id: 'donation_approval', name: 'Donation Approval', description: 'Approve donations' },
            { id: 'view_events', name: 'View Events', description: 'View events' },
            { id: 'edit_events', name: 'Edit Events', description: 'Edit events' },
            { id: 'pooja_registrations', name: 'Pooja Registrations', description: 'Manage pooja registrations' },
            { id: 'pooja_mobile_submit', name: 'Pooja Mobile Submit', description: 'Submit pooja from mobile' },
            { id: 'pooja_approval', name: 'Pooja Approval', description: 'Approve pooja requests' },
            { id: 'annadhanam_registrations', name: 'Annadhanam Registrations', description: 'Manage annadhanam registrations' },
            { id: 'annadhanam_approval', name: 'Annadhanam Approval', description: 'Approve annadhanam requests' },
            { id: 'hall_booking', name: 'Hall Booking', description: 'Book halls' },
            { id: 'hall_approval', name: 'Hall Approval', description: 'Approve hall bookings' },
            { id: 'marriage_register', name: 'Marriage Register', description: 'Manage marriage registrations' },
            { id: 'session_management', name: 'Session Management', description: 'Manage user sessions' },
            { id: 'activity_logs', name: 'Activity Logs', description: 'View activity logs' },
            { id: 'view_session_logs', name: 'View Session Logs', description: 'View session logs' }
          ];
          
          // Insert permissions if they don't exist
          for (const perm of requiredPermissions) {
            await trx('permissions')
              .insert(perm)
              .onConflict('id')
              .ignore();
          }
          
          const hashedPassword = await bcrypt.hash(password, 10);
          const [createdUser] = await trx('users')
            .insert({
              username,
              full_name: name,
              mobile,
              email: safeEmail,
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
          } else {
            // For regular members, assign default permissions if they exist
            const defaultPermissionIds = [
              'dashboard', 'member_entry', 'master_data', 'ledger_management', 
              'reports', 'balance_sheet', 'setting', 'pdf_settings', 
              'user_registrations', 'tax_registrations', 'property_registrations',
              'view_donations', 'edit_donations', 'donation_approval',
              'view_events', 'edit_events', 'pooja_registrations', 
              'pooja_mobile_submit', 'pooja_approval', 'annadhanam_registrations',
              'annadhanam_approval', 'hall_booking', 'hall_approval',
              'marriage_register', 'session_management', 'activity_logs',
              'view_session_logs'
            ];
            
            // Check which permissions actually exist in the database
            const existingPermissions = await trx('permissions')
              .select('id')
              .whereIn('id', defaultPermissionIds);
            
            const existingPermissionIds = existingPermissions.map(p => p.id);
            
            // Only insert permissions that actually exist
            if (existingPermissionIds.length > 0) {
              const defaultPerms = existingPermissionIds.map(pid => ({
                user_id: createdUser.id,
                permission_id: pid,
                access_level: 'view',
                created_at: trx.fn.now(),
                updated_at: trx.fn.now()
              }));
              
              await trx('user_permissions')
                .insert(defaultPerms)
                .onConflict(['user_id', 'permission_id'])
                .merge(['access_level', 'updated_at']);
            }
          }
          
          if (customPermissions && Array.isArray(customPermissions)) {
            // De-duplicate by permission_id and upsert to avoid UNIQUE constraint errors
            const uniqueMap = new Map();
            for (const perm of customPermissions) {
              if (!perm?.id) continue;
              uniqueMap.set(perm.id, perm.access || 'view');
            }
            const permissionRecords = Array.from(uniqueMap.entries()).map(([pid, access]) => ({
              user_id: createdUser.id,
              permission_id: pid,
              access_level: access,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            }));

            if (permissionRecords.length) {
              await trx('user_permissions')
                .insert(permissionRecords)
                .onConflict(['user_id', 'permission_id'])
                .merge(['access_level', 'updated_at']);
            }
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
      'setting',
      'pdf_settings'
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
  authorizePermission('member_entry', 'full') || 
  authorizePermission('member_view', 'view')
  , 
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
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    
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
    res.setHeader('Content-Disposition', `attachment; filename=session-logs.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Session Logs Report', { align: 'center' });
    doc.moveDown(0.5);
    
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

// Mount hall bookings router with special PDF receipt handling
const hallBookingsRouter = require('./hallBookings')({ db });
const skipReceiptPdfAuth = (req, res, next) => {
  const url = req.originalUrl || req.url || '';
  // If this is a request to the receipt PDF, let the specific router handle JWT via query token
  if (/\/api\/hall-bookings\/\d+\/receipt\.pdf(\?.*)?$/.test(url)) {
    return next();
  }
  return authenticateToken(req, res, next);
};
app.use('/api/hall-bookings', skipReceiptPdfAuth, authorizeRole(['admin','superadmin']), hallBookingsRouter);

// Mount journal router
const journalRouter = require('./routes/journal')({ db });
app.use('/api/journal', authenticateToken, authorizeRole(['admin','superadmin']), journalRouter);

// Mount donations router
const donationsRouter = require('./donations')({ db });
app.use('/api/donations', authenticateToken, donationsRouter);

// Mount annadhanam router
const annadhanamRouter = require('./annadhanam')({ db });
app.use('/api/annadhanam', authenticateToken, authorizePermission('annadhanam_registrations', 'view'), annadhanamRouter);

// ... (rest of the code remains the same)
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
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    
    // Log to database
    db('superadmin_logs').insert({
      user_id: req.user?.id || null,
      action: `${req.method} ${req.path}`,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: db.fn.now()
    }).catch(console.error);
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

// Mount tax registrations router (ensure correct index.js is used)
const taxRegistrationsRouter = require('./components/tax-registrations/index.js');
app.use('/api/tax-registrations', taxRegistrationsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
});