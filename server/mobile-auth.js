const express = require('express');
const router = express.Router();

module.exports = ({ db }) => {
  // Test OTP - in production, this should be generated and sent via SMS
  const TEST_OTP = '123456';

  // Test endpoint to check if mobile auth routes are working
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Mobile auth routes are working!',
      timestamp: new Date().toISOString()
    });
  });

  // Send OTP endpoint
  router.post('/send-otp', async (req, res) => {
    try {
      const { mobileNumber, name, receiptNumber } = req.body;

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required'
        });
      }

      // Clean mobile number (remove any formatting)
      const cleanMobile = mobileNumber.replace(/\D/g, '');

      if (cleanMobile.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mobile number'
        });
      }

      // Build query to find matching users
      let query = db('user_registrations').where('mobile_number', cleanMobile);
      
      // Optional name and receipt number filtering
      if (name) {
        query = query.andWhere('name', 'like', `%${name}%`);
      }
      if (receiptNumber) {
        query = query.andWhere('reference_number', receiptNumber);
      }

      const users = await query.select(
        'id', 
        'name', 
        'reference_number', 
        'mobile_number',
        'father_name',  // Additional context for multiple users
        'alternative_name'
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No users found with the provided details'
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        otp: TEST_OTP, // Development only
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          referenceNumber: user.reference_number,
          mobileNumber: user.mobile_number,
          fatherName: user.father_name,
          alternativeName: user.alternative_name
        }))
      });

    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Verify OTP and login endpoint
  router.post('/verify-otp', async (req, res) => {
    try {
      const { mobileNumber, name, receiptNumber, otp, userId } = req.body;

      // Only require mobileNumber and otp; userId is optional
      if (!mobileNumber || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number and OTP are required'
        });
      }

      // Verify OTP
      if (otp !== TEST_OTP) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP'
        });
      }

      // Clean mobile number
      const cleanMobile = mobileNumber.replace(/\D/g, '');

      let user;

      if (userId) {
        // Verify user exists by explicit userId and mobile
        let query = db('user_registrations')
          .where('id', userId)
          .andWhere('mobile_number', cleanMobile);
        if (name) query = query.andWhere('name', 'like', `%${name}%`);
        if (receiptNumber) query = query.andWhere('reference_number', receiptNumber);
        user = await query.first();
      } else {
        // Find user(s) by mobile (and optional hints)
        let listQuery = db('user_registrations').where('mobile_number', cleanMobile);
        if (name) listQuery = listQuery.andWhere('name', 'like', `%${name}%`);
        if (receiptNumber) listQuery = listQuery.andWhere('reference_number', receiptNumber);
        const users = await listQuery
          .select('id', 'name', 'reference_number', 'mobile_number')
          .orderBy('id', 'asc')
          .limit(2);

        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found with the provided mobile number'
          });
        }

        // If multiple users share the same mobile, pick the first deterministically
        // (In production, better to disambiguate; here we auto-select for a simpler UX.)
        user = users[0];
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found or details do not match'
        });
      }

      // Generate a simple session token (in production, use JWT)
      const sessionToken = `mobile_${user.id}_${Date.now()}`;

      res.json({
        success: true,
        message: 'Login successful',
        token: sessionToken,
        user: {
          id: user.id,
          name: user.name,
          referenceNumber: user.reference_number,
          mobileNumber: user.mobile_number
        }
      });

    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Custom token verification for mobile routes
  const verifyMobileToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !token.startsWith('mobile_')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing token'
      });
    }

    // Extract user ID from token
    const userId = parseInt(token.split('_')[1], 10);

    if (isNaN(userId)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    // Attach user ID to request for subsequent middleware/route handlers
    req.userId = userId;
    next();
  };

  // Get user profile endpoint
  router.get('/profile/:userId', verifyMobileToken, async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify user ID matches token
      if (parseInt(userId, 10) !== req.userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access'
        });
      }

      // Get user details
      const user = await db('user_registrations')
        .where('id', userId)
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          alternativeName: user.alternative_name,
          fatherName: user.father_name,
          mobileNumber: user.mobile_number,
          aadhaarNumber: user.aadhaar_number,
          address: user.address,
          postalCode: user.postal_code,
          education: user.education,
          occupation: user.occupation,
          clan: user.clan,
          group: user.group,
          referenceNumber: user.reference_number,
          maleHeirs: user.male_heirs,
          femaleHeirs: user.female_heirs,
          createdAt: user.created_at
        }
      });

    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Enhanced payment details endpoint
  router.get('/payment-details/:userId', verifyMobileToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const currentYear = new Date().getFullYear();

      // Fetch user basic info
      const user = await db('user_registrations')
        .where('id', userId)
        .select('id', 'name', 'reference_number', 'mobile_number')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Fetch tax payments for current and previous two years
      const taxPayments = await db('tax_payments')
        .where('user_id', userId)
        .whereIn('year', [currentYear, currentYear - 1, currentYear - 2])
        .orderBy('year', 'desc');

      // Fetch pooja payments for current and previous two years
      const poojaPayments = await db('pooja_payments')
        .where('user_id', userId)
        .whereIn('year', [currentYear, currentYear - 1, currentYear - 2])
        .orderBy('year', 'desc');

      // Aggregate payment summaries
      const paymentSummary = [currentYear, currentYear - 1, currentYear - 2].map(year => {
        const taxForYear = taxPayments.find(p => p.year === year) || { 
          total_amount: 0, 
          paid_amount: 0 
        };
        const poojaForYear = poojaPayments.find(p => p.year === year) || { 
          total_amount: 0, 
          paid_amount: 0 
        };

        return {
          year,
          tax: {
            totalAmount: taxForYear.total_amount || 0,
            paidAmount: taxForYear.paid_amount || 0,
            pendingAmount: Math.max(0, (taxForYear.total_amount || 0) - (taxForYear.paid_amount || 0)),
            status: taxForYear.paid_amount >= taxForYear.total_amount ? 'paid' : 
                    taxForYear.paid_amount > 0 ? 'partial' : 'pending'
          },
          pooja: {
            totalAmount: poojaForYear.total_amount || 0,
            paidAmount: poojaForYear.paid_amount || 0,
            pendingAmount: Math.max(0, (poojaForYear.total_amount || 0) - (poojaForYear.paid_amount || 0)),
            bookings: poojaPayments.filter(p => p.year === year).length,
            approvedBookings: poojaPayments.filter(p => p.year === year && p.status === 'approved').length
          },
          total: {
            totalAmount: (taxForYear.total_amount || 0) + (poojaForYear.total_amount || 0),
            paidAmount: (taxForYear.paid_amount || 0) + (poojaForYear.paid_amount || 0),
            pendingAmount: Math.max(0, 
              ((taxForYear.total_amount || 0) - (taxForYear.paid_amount || 0)) + 
              ((poojaForYear.total_amount || 0) - (poojaForYear.paid_amount || 0))
            )
          }
        };
      });

      // Combine payment history
      const paymentHistory = [
        ...taxPayments.map(payment => ({
          type: 'tax',
          year: payment.year,
          amount: payment.total_amount,
          paidAmount: payment.paid_amount,
          status: payment.paid_amount >= payment.total_amount ? 'paid' : 
                  payment.paid_amount > 0 ? 'partial' : 'pending',
          date: payment.created_at,
          description: `Tax Payment - Year ${payment.year}`
        })),
        ...poojaPayments.map(payment => ({
          type: 'pooja',
          year: payment.year,
          amount: payment.total_amount,
          paidAmount: payment.paid_amount,
          status: payment.status || 'pending',
          date: payment.created_at,
          description: `Pooja Payment - Year ${payment.year}`
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate total outstanding
      const totalOutstanding = paymentSummary.reduce((sum, yearPayment) => 
        sum + yearPayment.total.pendingAmount, 0);

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          referenceNumber: user.reference_number,
          mobileNumber: user.mobile_number
        },
        paymentSummary,
        paymentHistory,
        currentYear,
        totalOutstanding
      });

    } catch (error) {
      console.error('Error fetching payment details:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
};
