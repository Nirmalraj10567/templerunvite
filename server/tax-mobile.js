const express = require('express');

module.exports = function createTaxMobileRouter(deps = {}) {
  const { db } = deps;
  const router = express.Router();

  // Helper: normalize mobile to digits-only 10-12 length
  const normMobile = (m) => (m ? String(m).replace(/\D/g, '') : '');

  // Public endpoint: fetch tax registrations for a mobile number within a temple
  // GET /api/tax-mobile/by-mobile?templeId=1&mobile=9876543210[&year=2025][&pending=1]
  router.get('/by-mobile', async (req, res) => {
    try {
      const templeId = Number(req.query.templeId) || null;
      const mobile = normMobile(req.query.mobile || '');
      const yearParam = req.query.year ? Number(req.query.year) : new Date().getFullYear();
      const pending = req.query.pending === '1' || req.query.pending === 'true';

      if (!templeId || !mobile) {
        return res.status(400).json({ success: false, error: 'templeId and mobile are required' });
      }

      let q = db('user_tax_registrations')
        .where('temple_id', templeId)
        .andWhereRaw("REPLACE(COALESCE(mobile_number, ''), ' ', '') LIKE ?", [`%${mobile}%`]);

      if (Number.isFinite(yearParam)) {
        q = q.andWhere('year', yearParam);
      }

      const rows = await q
        .orderBy('created_at', 'desc')
        .limit(100)
        .select('*');

      let data = rows.map((r) => {
        const tax = Number(r.tax_amount || 0);
        const paid = Number(r.amount_paid || 0);
        const outstanding = r.outstanding_amount != null ? Number(r.outstanding_amount) : Math.max(0, tax - paid);
        return {
          id: r.id,
          reference_number: r.reference_number,
          date: r.date,
          year: r.year,
          name: r.name,
          village: r.village,
          mobile_number: r.mobile_number,
          tax_amount: tax,
          amount_paid: paid,
          outstanding_amount: outstanding,
          status: outstanding > 0 ? 'pending' : 'paid',
        };
      });

      // If no record for current year, check tax settings and return pending entry
      const currentYear = new Date().getFullYear();
      if (rows.length === 0 && yearParam === currentYear) {
        const settings = await db('tax_settings').where({ temple_id: templeId, year: currentYear }).first();
        const defaultTax = settings ? Number(settings.tax_amount || 0) : 0;
        
        if (defaultTax > 0) {
          data = [{
            id: null,
            reference_number: null,
            date: null,
            year: currentYear,
            name: null,
            village: null,
            mobile_number: mobile,
            tax_amount: defaultTax,
            amount_paid: 0,
            outstanding_amount: defaultTax,
            status: 'pending',
            is_new: true
          }];
        }
      }

      // Apply pending filter if requested
      const filteredData = pending ? data.filter(item => item.status === 'pending') : data;

      res.json({ success: true, data: filteredData, temple_id: templeId, mobile, filtered: pending });
    } catch (e) {
      console.error('GET /api/tax-mobile/by-mobile error:', e);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Public endpoint: summary for a mobile (totals by year)
  // GET /api/tax-mobile/summary?templeId=1&mobile=9876543210[&pending=1]
  router.get('/summary', async (req, res) => {
    try {
      const templeId = Number(req.query.templeId) || null;
      const mobile = normMobile(req.query.mobile || '');
      const pending = req.query.pending === '1' || req.query.pending === 'true';
      
      if (!templeId || !mobile) {
        return res.status(400).json({ success: false, error: 'templeId and mobile are required' });
      }

      const rows = await db('user_tax_registrations')
        .where('temple_id', templeId)
        .andWhereRaw("REPLACE(COALESCE(mobile_number, ''), ' ', '') LIKE ?", [`%${mobile}%`])
        .select('year', 'tax_amount', 'amount_paid', 'outstanding_amount')
        .orderBy('year', 'desc')
        .limit(1000);

      const byYear = new Map();
      for (const r of rows) {
        const y = Number(r.year || 0);
        const tax = Number(r.tax_amount || 0);
        const paid = Number(r.amount_paid || 0);
        const outstanding = r.outstanding_amount != null ? Number(r.outstanding_amount) : Math.max(0, tax - paid);
        
        // Apply pending filter: only include records with outstanding amount > 0
        if (pending && outstanding <= 0) {
          continue;
        }
        
        const prev = byYear.get(y) || { year: y, tax_amount: 0, amount_paid: 0, outstanding_amount: 0 };
        prev.tax_amount += tax;
        prev.amount_paid += paid;
        prev.outstanding_amount += outstanding;
        byYear.set(y, prev);
      }

      const summary = Array.from(byYear.values())
        .sort((a, b) => b.year - a.year);

      const totals = summary.reduce((acc, s) => ({
        tax_amount: acc.tax_amount + s.tax_amount,
        amount_paid: acc.amount_paid + s.amount_paid,
        outstanding_amount: acc.outstanding_amount + s.outstanding_amount,
      }), { tax_amount: 0, amount_paid: 0, outstanding_amount: 0 });

      res.json({ success: true, data: { summary_by_year: summary, totals }, temple_id: templeId, mobile, filtered: pending });
    } catch (e) {
      console.error('GET /api/tax-mobile/summary error:', e);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
