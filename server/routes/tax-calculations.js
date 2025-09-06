const express = require('express');
const router = express.Router();

/**
 * Bulk toggle include_previous_years for all tax settings
 * POST /api/tax-settings/bulk-toggle
 */
router.post('/tax-settings/bulk-toggle', 
  async (req, res) => {
    try {
      const { includePreviousYears } = req.body;
      const templeId = req.user.templeId;

      await req.db('tax_settings')
        .where('temple_id', templeId)
        .update({
          include_previous_years: includePreviousYears !== undefined ? includePreviousYears : false,
          updated_at: req.db.fn.now()
        });

      res.json({ success: true });
    } catch (err) {
      console.error('Error bulk updating tax settings:', err);
      res.status(500).json({ error: 'Database error while updating tax settings.' });
    }
  }
);

/**
 * Get tax amount for a specific year
 * GET /api/tax-settings/year/:year
 */
router.get('/tax-settings/year/:year', 
  async (req, res) => {
    try {
      const { year } = req.params;
      const templeId = req.user.templeId;
      
      const setting = await req.db('tax_settings')
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

/**
 * Calculate cumulative tax for a user based on mobile number (NEW registrations only)
 * GET /api/tax-calculations/cumulative/:mobile
 */
router.get('/tax-calculations/cumulative/:mobile', 
  async (req, res) => {
    try {
      const { mobile } = req.params;
      const { currentYear } = req.query;
      const templeId = req.user.templeId;
      
      // Get all tax settings for this temple (active ones)
      const taxSettings = await req.db('tax_settings')
        .where({ temple_id: templeId, is_active: true })
        .orderBy('year', 'asc');

      // Get all tax registrations for this mobile number
      const existingRegistrations = await req.db('user_tax_registrations')
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
      let joiningYear = null;

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
            
            // Set joining year to the earliest year with registration
            if (!joiningYear || year < joiningYear) {
              joiningYear = year;
            }
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
              
              // Set joining year to the earliest year with tax setting
              if (!joiningYear || year < joiningYear) {
                joiningYear = year;
              }
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
          
          // Set joining year to current year if no previous years
          if (!joiningYear) {
            joiningYear = year;
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
          joiningYear: joiningYear || currentYear
        }
      });
    } catch (err) {
      console.error('Error calculating cumulative tax:', err);
      res.status(500).json({ error: 'Database error while calculating cumulative tax.' });
    }
  }
);

module.exports = router;
