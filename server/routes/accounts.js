const express = require('express');

module.exports = function accountsRouterFactory(deps = {}) {
  const { db, authenticateToken, authorizePermission } = deps;
  const router = express.Router();

  const canView = [
    authenticateToken,
    authorizePermission ? authorizePermission('ledger_management', 'view') : (_req, _res, next) => next(),
  ];
  const canEdit = [
    authenticateToken,
    authorizePermission ? authorizePermission('ledger_management', 'edit') : (_req, _res, next) => next(),
  ];

  async function ensureTables() {
    const hasLedgers = await db.schema.hasTable('account_ledgers');
    if (!hasLedgers) {
      await db.schema.createTable('account_ledgers', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.string('name', 150).notNullable();
        table.string('category', 40).notNullable().defaultTo('asset');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
    } else {
      const requiredLedgerColumns = [
        ['temple_id', (t) => t.integer('temple_id').notNullable().defaultTo(1).index()],
        ['name', (t) => t.string('name', 150).nullable()],
        ['category', (t) => t.string('category', 40).notNullable().defaultTo('asset')],
      ];
      for (const [column, addColumn] of requiredLedgerColumns) {
        const hasColumn = await db.schema.hasColumn('account_ledgers', column);
        if (!hasColumn) {
          await db.schema.alterTable('account_ledgers', (table) => addColumn(table));
        }
      }
    }

    const hasAccounts = await db.schema.hasTable('accounts');
    if (!hasAccounts) {
      await db.schema.createTable('accounts', (table) => {
        table.increments('id').primary();
        table.string('code', 60).nullable();
        table.string('category', 60).nullable();
        table.integer('temple_id').notNullable().index();
        table.string('account_name', 150).notNullable();
        table.enum('account_type', ['cash', 'bank', 'upi']).notNullable();
        table.string('bank_name', 120).nullable();
        table.string('account_number', 50).nullable();
        table.string('ifsc_code', 20).nullable();
        table.string('upi_id', 120).nullable();
        table.decimal('opening_balance', 14, 2).notNullable().defaultTo(0);
        table.integer('ledger_id').notNullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
    } else {
      const requiredColumns = [
        ['code', (t) => t.string('code', 60).nullable()],
        ['category', (t) => t.string('category', 60).nullable()],
        ['name', (t) => t.string('name', 150).nullable()],
        ['account_name', (t) => t.string('account_name', 150).nullable()],
        ['temple_id', (t) => t.integer('temple_id').notNullable().defaultTo(1).index()],
        ['account_type', (t) => t.enum('account_type', ['cash', 'bank', 'upi']).notNullable().defaultTo('cash')],
        ['bank_name', (t) => t.string('bank_name', 120).nullable()],
        ['account_number', (t) => t.string('account_number', 50).nullable()],
        ['ifsc_code', (t) => t.string('ifsc_code', 20).nullable()],
        ['upi_id', (t) => t.string('upi_id', 120).nullable()],
        ['opening_balance', (t) => t.decimal('opening_balance', 14, 2).notNullable().defaultTo(0)],
        ['ledger_id', (t) => t.integer('ledger_id').nullable().index()],
        ['created_at', (t) => t.timestamp('created_at').defaultTo(db.fn.now())],
        ['updated_at', (t) => t.timestamp('updated_at').defaultTo(db.fn.now())],
      ];
      for (const [column, addColumn] of requiredColumns) {
        const hasColumn = await db.schema.hasColumn('accounts', column);
        if (!hasColumn) {
          await db.schema.alterTable('accounts', (table) => addColumn(table));
        }
      }
    }
  }

  async function ensureLedgerForAccount({ templeId, accountName, accountType }) {
    const preferredName = accountType === 'cash' ? 'CASH A/C' : accountName;
    const existing = await db('account_ledgers')
      .where({ temple_id: templeId, name: preferredName })
      .first();
    if (existing) return existing.id;

    const [ledgerId] = await db('account_ledgers').insert({
      temple_id: templeId,
      name: preferredName,
      category: accountType === 'cash' ? 'cash' : accountType,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return ledgerId;
  }

  async function ensureDefaultCashAccount(templeId) {
    const existingCash = await db('accounts')
      .where('temple_id', templeId)
      .andWhere((q) => q.where('account_type', 'cash').orWhere('type', 'cash'))
      .first();
    if (existingCash) return existingCash;

    const ledgerId = await ensureLedgerForAccount({
      templeId,
      accountName: 'Cash A/c',
      accountType: 'cash',
    });
    const [accountId] = await db('accounts').insert({
      code: `CASH-${templeId}`,
      category: 'cash',
      name: 'Cash A/c',
      temple_id: templeId,
      account_name: 'Cash A/c',
      account_type: 'cash',
      opening_balance: 0,
      ledger_id: ledgerId,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return db('accounts').where({ id: accountId }).first();
  }

  ensureTables().catch((e) => {
    console.error('accounts route table init failed:', e.message);
  });

  router.get('/', ...canView, async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const type = (req.query.type || '').toString().toLowerCase();
      await ensureDefaultCashAccount(templeId);

      let query = db('accounts as a')
        .leftJoin('account_ledgers as l', 'a.ledger_id', 'l.id')
        .where('a.temple_id', templeId)
        .select('a.*', 'l.name as ledgerName')
        .orderBy('a.account_name', 'asc');

      if (type) query = query.andWhere((q) => q.where('a.account_type', type).orWhere('a.type', type));
      const rawRows = await query;
      const rows = rawRows.map((r) => ({
        id: r.id,
        accountName: r.account_name || r.name || '',
        accountType: (r.account_type || r.type || 'cash'),
        bankName: r.bank_name || null,
        accountNumber: r.account_number || null,
        ifscCode: r.ifsc_code || null,
        upiId: r.upi_id || null,
        openingBalance: Number(r.opening_balance || 0),
        ledgerId: Number(r.ledger_id || 0),
        ledgerName: r.ledgerName || r.account_name || r.name || '',
      }));
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('GET /api/accounts error:', err);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  router.post('/', ...canEdit, async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const body = req.body || {};
      const accountName = String(body.accountName || '').trim();
      const accountType = String(body.accountType || '').trim().toLowerCase();

      if (!accountName) {
        return res.status(400).json({ error: 'Account name is required' });
      }
      if (!['bank', 'upi', 'cash'].includes(accountType)) {
        return res.status(400).json({ error: 'Valid account type is required' });
      }

      const ledgerId = await ensureLedgerForAccount({ templeId, accountName, accountType });
      const [id] = await db('accounts').insert({
        code: String(body.code || `${accountType.toUpperCase()}-${Date.now()}`),
        category: accountType,
        name: accountName,
        temple_id: templeId,
        account_name: accountName,
        account_type: accountType,
        bank_name: body.bankName || null,
        account_number: body.accountNumber || null,
        ifsc_code: body.ifscCode || null,
        upi_id: body.upiId || null,
        opening_balance: Number(body.openingBalance || 0),
        ledger_id: ledgerId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      const created = await db('accounts as a')
        .leftJoin('account_ledgers as l', 'a.ledger_id', 'l.id')
        .where('a.id', id)
        .select('a.*', 'l.name as ledgerName')
        .first();
      res.status(201).json({
        success: true,
        data: {
          id: created.id,
          accountName: created.account_name || created.name || '',
          accountType: created.account_type || created.type || 'cash',
          bankName: created.bank_name || null,
          accountNumber: created.account_number || null,
          ifscCode: created.ifsc_code || null,
          upiId: created.upi_id || null,
          openingBalance: Number(created.opening_balance || 0),
          ledgerId: Number(created.ledger_id || 0),
          ledgerName: created.ledgerName || created.account_name || created.name || '',
        },
      });
    } catch (err) {
      console.error('POST /api/accounts error:', err);
      res.status(500).json({ error: 'Failed to create account', details: err.message });
    }
  });

  return router;
};
