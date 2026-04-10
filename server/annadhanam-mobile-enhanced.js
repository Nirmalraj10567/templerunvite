const express = require('express');
const router = express.Router();

// Enhanced Annadhanam Mobile API
// Based on annadhanam-free-meal-service-flow.png flowchart

async function generateReceiptNumber(db, templeId) {
  const year = new Date().getFullYear();
  
  const latest = await db('annadhanam')
    .where('temple_id', templeId)
    .where('receipt_number', 'like', `${year}-%`)
    .orderBy('id', 'desc')
    .first();

  let nextNumber = 1;
  
  if (latest && latest.receipt_number) {
    const parts = latest.receipt_number.split('-');
    if (parts.length === 2 && parts[0] === year.toString()) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }
  
  return `${year}-${String(nextNumber).padStart(4, '0')}`;
}

async function calculateAmount(db, packageId, peopleCount, templeId) {
  if (!packageId || !peopleCount) return 0;
  
  const pkg = await db('meal_packages')
    .where({ id: packageId, temple_id: templeId, is_active: 1 })
    .first();
  
  if (!pkg) return 0;
  
  const basePrice = parseFloat(pkg.base_price) || 0;
  const pricePerPerson = parseFloat(pkg.price_per_person) || 0;
  const count = parseInt(peopleCount) || 0;
  
  return basePrice + (pricePerPerson * count);
}

async function checkSlotAvailability(db, templeId, slotDate, mealTime, requestedCount) {
  const slot = await db('meal_slots')
    .where({ 
      temple_id: templeId, 
      slot_date: slotDate, 
      meal_time: mealTime 
    })
    .first();
  
  if (!slot) {
    const defaultCapacity = 100;
    await db('meal_slots').insert({
      temple_id: templeId,
      slot_date: slotDate,
      meal_time: mealTime,
      total_capacity: defaultCapacity,
      booked_count: 0,
      available_count: defaultCapacity,
      is_available: 1
    });
    
    return {
      available: true,
      availableCount: defaultCapacity,
      message: 'Slot available'
    };
  }
  
  if (!slot.is_available || slot.available_count < requestedCount) {
    return {
      available: false,
      availableCount: slot.available_count,
      message: `Only ${slot.available_count} slots available. You requested ${requestedCount}.`
    };
  }
  
  return {
    available: true,
    availableCount: slot.available_count,
    message: 'Slot available'
  };
}

async function updateSlotBooking(db, templeId, slotDate, mealTime, count, isCancellation = false) {
  const slot = await db('meal_slots')
    .where({ temple_id: templeId, slot_date: slotDate, meal_time: mealTime })
    .first();
  
  if (!slot) return false;
  
  const adjustment = isCancellation ? -count : count;
  const newBooked = Math.max(0, (slot.booked_count || 0) + adjustment);
  const newAvailable = Math.max(0, slot.total_capacity - newBooked);
  
  await db('meal_slots')
    .where({ id: slot.id })
    .update({
      booked_count: newBooked,
      available_count: newAvailable,
      is_available: newAvailable > 0,
      updated_at: db.fn.now()
    });
  
  return true;
}

module.exports = function(deps = {}) {
  const { db } = deps;

  // Helper to resolve temple ID
  async function resolveTempleId(templeIdParam) {
    let templeId = Number(templeIdParam) || null;
    try {
      if (templeId) {
        const t = await db('temples').where({ id: templeId }).first();
        if (!t) templeId = null;
      }
      if (!templeId) {
        let row = null;
        try {
          row = await db('temples').min({ id: 'id' }).first();
        } catch {}
        templeId = Number(row?.id) || 1;
      }
    } catch {
      templeId = 1;
    }
    return templeId;
  }

  // ==========================================
  // MOBILE BOOKING WORKFLOW (Flowchart Implementation)
  // ==========================================
  
  // Step 1: Check Donor Availability & Save
  router.post('/check-donor', async (req, res) => {
    try {
      const { mobile_number, name, email, address } = req.body;
      
      if (!mobile_number || !name) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number and name are required'
        });
      }
      
      const templeId = await resolveTempleId(req.body.temple_id);
      
      // Check if donor exists (Flowchart: Donor Available?)
      let donor = await db('donors')
        .where({ mobile_number, temple_id: templeId })
        .first();
      
      if (donor) {
        // Update donor info
        await db('donors')
          .where({ id: donor.id })
          .update({
            name,
            email: email || donor.email,
            address: address || donor.address,
            updated_at: db.fn.now()
          });
        
        donor = await db('donors').where({ id: donor.id }).first();
        
        return res.json({
          success: true,
          exists: true,
          data: donor,
          message: 'Existing donor found'
        });
      }
      
      // Create new donor (Flowchart: Save Donor)
      const [donorId] = await db('donors').insert({
        temple_id: templeId,
        name,
        mobile_number,
        email: email || null,
        address: address || null,
        donor_type: 'individual',
        is_walk_in: false,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      
      donor = await db('donors').where({ id: donorId }).first();
      
      res.json({
        success: true,
        exists: false,
        data: donor,
        message: 'New donor created'
      });
    } catch (err) {
      console.error('POST /api/annadhanam-mobile/check-donor error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Step 2: Get Available Slots (Flowchart: Check Availability)
  router.get('/available-slots', async (req, res) => {
    try {
      const { date, meal_time, people_count, temple_id } = req.query;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date is required'
        });
      }
      
      const templeId = await resolveTempleId(temple_id);
      const requestedCount = parseInt(people_count) || 1;
      
      let query = db('meal_slots')
        .where({ 
          temple_id: templeId, 
          slot_date: date,
          is_available: 1 
        })
        .where('available_count', '>=', requestedCount);
      
      if (meal_time) {
        query = query.andWhere('meal_time', meal_time);
      }
      
      const slots = await query.orderBy('meal_time');
      
      // If no slots found, show default availability
      if (slots.length === 0) {
        const defaultMealTimes = ['breakfast', 'lunch', 'dinner'];
        const defaultSlots = defaultMealTimes.map(time => ({
          slot_date: date,
          meal_time: time,
          total_capacity: 100,
          booked_count: 0,
          available_count: 100,
          is_available: true,
          is_default: true
        }));
        
        return res.json({
          success: true,
          data: defaultSlots,
          message: 'Default slots available'
        });
      }
      
      res.json({
        success: true,
        data: slots,
        count: slots.length
      });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/available-slots error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Step 3: Get Meal Packages (Flowchart: Select Package)
  router.get('/packages', async (req, res) => {
    try {
      const { meal_time, temple_id } = req.query;
      const templeId = await resolveTempleId(temple_id);
      
      let query = db('meal_packages')
        .where({ temple_id: templeId, is_active: 1 });
      
      if (meal_time) {
        query = query.andWhere('meal_time', meal_time);
      }
      
      const packages = await query.orderBy('name');
      
      res.json({
        success: true,
        data: packages
      });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/packages error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Step 4: Calculate Amount (Flowchart: Calculate Amount)
  router.post('/calculate', async (req, res) => {
    try {
      const { package_id, people_count, temple_id } = req.body;
      
      if (!package_id || !people_count) {
        return res.status(400).json({
          success: false,
          error: 'package_id and people_count are required'
        });
      }
      
      const templeId = await resolveTempleId(temple_id);
      const amount = await calculateAmount(db, package_id, people_count, templeId);
      
      const pkg = await db('meal_packages')
        .where({ id: package_id, temple_id: templeId })
        .first();
      
      res.json({
        success: true,
        data: {
          package_id,
          people_count: parseInt(people_count),
          calculated_amount: amount,
          breakdown: {
            base_price: pkg?.base_price || 0,
            price_per_person: pkg?.price_per_person || 0,
            people_count: parseInt(people_count),
            per_person_total: (pkg?.price_per_person || 0) * parseInt(people_count)
          }
        }
      });
    } catch (err) {
      console.error('POST /api/annadhanam-mobile/calculate error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Step 5: Submit Booking Request (Flowchart: Show Summary -> Confirm)
  router.post('/submit', async (req, res) => {
    try {
      const {
        donor_id,
        name,
        mobile_number,
        email,
        address,
        package_id,
        peoples,
        time,
        from_date,
        to_date,
        remarks,
        special_instructions,
        temple_id
      } = req.body;
      
      // Validation
      if (!name || !mobile_number || !time || !from_date || !to_date || !peoples) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, mobile_number, time, from_date, to_date, peoples'
        });
      }
      
      if (new Date(from_date) > new Date(to_date)) {
        return res.status(400).json({
          success: false,
          error: 'From date cannot be later than to date'
        });
      }
      
      if (!/^[0-9]{10}$/.test(mobile_number)) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number must be 10 digits'
        });
      }
      
      const templeId = await resolveTempleId(temple_id);
      const peopleCount = parseInt(peoples);
      
      if (isNaN(peopleCount) || peopleCount < 1) {
        return res.status(400).json({
          success: false,
          error: 'Number of people must be at least 1'
        });
      }
      
      // Check slot availability (Flowchart: Slot Available?)
      const availability = await checkSlotAvailability(
        db,
        templeId,
        from_date,
        time,
        peopleCount
      );
      
      if (!availability.available) {
        // Get alternative dates (Flowchart: Suggest Alternatives)
        const date = new Date(from_date);
        const alternatives = [];
        
        for (let i = 1; i <= 7; i++) {
          const nextDate = new Date(date);
          nextDate.setDate(date.getDate() + i);
          const dateStr = nextDate.toISOString().split('T')[0];
          
          const altAvailability = await checkSlotAvailability(
            db,
            templeId,
            dateStr,
            time,
            peopleCount
          );
          
          if (altAvailability.available) {
            alternatives.push({
              date: dateStr,
              meal_time: time,
              available_count: altAvailability.availableCount
            });
            
            if (alternatives.length >= 3) break;
          }
        }
        
        return res.status(400).json({
          success: false,
          error: 'Slot not available',
          message: availability.message,
          available_count: availability.availableCount,
          alternatives: alternatives
        });
      }
      
      // Handle donor
      let finalDonorId = donor_id;
      
      if (!finalDonorId) {
        let donor = await db('donors')
          .where({ mobile_number, temple_id: templeId })
          .first();
        
        if (!donor) {
          const [newDonorId] = await db('donors').insert({
            temple_id: templeId,
            name,
            mobile_number,
            email: email || null,
            address: address || null,
            donor_type: 'individual',
            is_walk_in: false,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
          finalDonorId = newDonorId;
        } else {
          finalDonorId = donor.id;
        }
      }
      
      // Calculate amount (Flowchart: Calculate Amount)
      let calculatedAmount = 0;
      if (package_id) {
        calculatedAmount = await calculateAmount(db, package_id, peopleCount, templeId);
      }
      
      // Create booking
      const receiptNumber = await generateReceiptNumber(db, templeId);
      
      const record = {
        temple_id: templeId,
        donor_id: finalDonorId,
        package_id: package_id || null,
        receipt_number: receiptNumber,
        name,
        mobile_number,
        food: special_instructions || remarks || '',
        peoples: peopleCount,
        time,
        from_date,
        to_date,
        remarks: remarks || null,
        special_instructions: special_instructions || null,
        calculated_amount: calculatedAmount,
        confirmation_status: 'pending',
        service_status: 'pending',
        booking_source: 'mobile',
        is_walk_in: false,
        created_by: null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      };
      
      const [insertedId] = await db('annadhanam').insert(record);
      
      // Update slot booking
      await updateSlotBooking(db, templeId, from_date, time, peopleCount);
      
      // Add approval log entry
      try {
        await db('annadhanam_approval_logs').insert({
          annadhanam_id: insertedId,
          action: 'submitted',
          performed_by: null,
          performed_at: new Date(),
          notes: `Submitted from mobile app`,
          old_status: null,
          new_status: 'pending'
        });
      } catch (e) {
        // Table may not exist
      }
      
      const createdRow = await db('annadhanam').where({ id: insertedId }).first();
      
      res.json({
        success: true,
        data: createdRow,
        message: 'Booking submitted successfully. Awaiting confirmation.'
      });
    } catch (err) {
      console.error('POST /api/annadhanam-mobile/submit error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Step 6: Get My Bookings
  router.get('/my-bookings', async (req, res) => {
    try {
      const { mobile_number, temple_id } = req.query;
      
      if (!mobile_number) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required'
        });
      }
      
      const templeId = await resolveTempleId(temple_id);
      
      const bookings = await db('annadhanam as a')
        .leftJoin('meal_packages as p', 'a.package_id', 'p.id')
        .where({ 
          'a.mobile_number': mobile_number, 
          'a.temple_id': templeId 
        })
        .select(
          'a.*',
          'p.name as package_name',
          'p.description as package_description'
        )
        .orderBy('a.from_date', 'desc');
      
      res.json({
        success: true,
        data: bookings,
        count: bookings.length
      });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/my-bookings error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Step 7: Submit Feedback (Flowchart: Collect Feedback)
  router.post('/:id/feedback', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        mobile_number,
        rating,
        feedback_text,
        food_quality_rating,
        service_rating,
        cleanliness_rating,
        would_recommend
      } = req.body;
      
      if (!mobile_number) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required'
        });
      }
      
      const booking = await db('annadhanam')
        .where({ 
          id, 
          mobile_number,
          service_status: 'completed'
        })
        .first();
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found or not yet completed'
        });
      }
      
      // Check if feedback already exists
      const existing = await db('annadhanam_feedback')
        .where({ annadhanam_id: id })
        .first();
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Feedback already submitted for this booking'
        });
      }
      
      await db('annadhanam_feedback').insert({
        temple_id: booking.temple_id,
        annadhanam_id: id,
        donor_id: booking.donor_id,
        rating,
        feedback_text: feedback_text || null,
        food_quality_rating: food_quality_rating || null,
        service_rating: service_rating || null,
        cleanliness_rating: cleanliness_rating || null,
        would_recommend: would_recommend !== undefined ? would_recommend : null,
        created_at: db.fn.now()
      });
      
      res.json({
        success: true,
        message: 'Thank you for your feedback!'
      });
    } catch (err) {
      console.error('POST /api/annadhanam-mobile/:id/feedback error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Cancel booking (only if pending)
  router.put('/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number, reason } = req.body;
      
      if (!mobile_number) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required'
        });
      }
      
      const booking = await db('annadhanam')
        .where({ 
          id, 
          mobile_number,
          confirmation_status: 'pending'
        })
        .first();
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found or cannot be cancelled'
        });
      }
      
      // Release slot
      await updateSlotBooking(
        db,
        booking.temple_id,
        booking.from_date,
        booking.time,
        booking.peoples,
        true
      );
      
      await db('annadhanam')
        .where({ id })
        .update({
          confirmation_status: 'cancelled',
          remarks: `${booking.remarks || ''} | Cancelled: ${reason || 'No reason'}`,
          updated_at: db.fn.now()
        });
      
      // Log cancellation
      try {
        await db('annadhanam_approval_logs').insert({
          annadhanam_id: id,
          action: 'cancelled',
          performed_by: null,
          performed_at: new Date(),
          notes: `Cancelled by user: ${reason || 'No reason provided'}`,
          old_status: 'pending',
          new_status: 'cancelled'
        });
      } catch (e) {}
      
      res.json({
        success: true,
        message: 'Booking cancelled successfully'
      });
    } catch (err) {
      console.error('PUT /api/annadhanam-mobile/:id/cancel error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get booking details
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number } = req.query;
      
      if (!mobile_number) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required'
        });
      }
      
      const booking = await db('annadhanam as a')
        .leftJoin('meal_packages as p', 'a.package_id', 'p.id')
        .where({ 
          'a.id': id, 
          'a.mobile_number': mobile_number 
        })
        .select(
          'a.*',
          'p.name as package_name',
          'p.description as package_description',
          'p.base_price',
          'p.price_per_person'
        )
        .first();
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }
      
      // Get approval logs
      let logs = [];
      try {
        logs = await db('annadhanam_approval_logs')
          .where('annadhanam_id', id)
          .orderBy('performed_at', 'desc');
      } catch {}
      
      // Get feedback if exists
      const feedback = await db('annadhanam_feedback')
        .where({ annadhanam_id: id })
        .first();
      
      res.json({
        success: true,
        data: {
          ...booking,
          logs,
          feedback
        }
      });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get latest booking for a mobile number
  router.get('/latest', async (req, res) => {
    try {
      const { mobile_number, temple_id } = req.query;
      
      if (!mobile_number) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required'
        });
      }
      
      const templeId = await resolveTempleId(temple_id);
      
      const booking = await db('annadhanam as a')
        .leftJoin('meal_packages as p', 'a.package_id', 'p.id')
        .where({ 
          'a.mobile_number': mobile_number,
          'a.temple_id': templeId 
        })
        .select(
          'a.*',
          'p.name as package_name',
          'p.description as package_description'
        )
        .orderBy('a.created_at', 'desc')
        .first();
      
      if (!booking) {
        return res.json({ success: true, data: null });
      }
      
      res.json({ success: true, data: booking });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/latest error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
