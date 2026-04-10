const express = require('express');
const router = express.Router();

// Enhanced Annadhanam Module
// Based on annadhanam-free-meal-service-flow.png flowchart
// Features: Donor Management, Meal Slots, Packages, Service Delivery, Feedback

// Function to generate the next receipt number in format YYYY-XXXX
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

// Calculate amount based on package and people count
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

// Check slot availability
async function checkSlotAvailability(db, templeId, slotDate, mealTime, requestedCount) {
  const slot = await db('meal_slots')
    .where({ 
      temple_id: templeId, 
      slot_date: slotDate, 
      meal_time: mealTime 
    })
    .first();
  
  if (!slot) {
    // If no slot exists, create default slot
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

// Update slot booking count
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

  // Helper to write annadhanam logs
  async function logAnnadhanamAction({ annadhanamId, templeId, userId, action, details }) {
    try {
      const has = await db.schema.hasTable('annadhanam_logs');
      if (!has) {
        console.warn('annadhanam_logs table does not exist');
        return;
      }
      
      const logData = {
        annadhanam_id: Number(annadhanamId),
        temple_id: Number(templeId),
        created_by: userId ? Number(userId) : null,
        action,
        details: details ? JSON.stringify(details) : null,
        created_at: db.fn.now(),
      };
      
      await db('annadhanam_logs').insert(logData);
    } catch (e) {
      console.error('Failed to write annadhanam_logs:', e.message);
    }
  }

  // ==========================================
  // DONOR MANAGEMENT ENDPOINTS
  // ==========================================
  
  // List donors with search
  router.get('/donors', async (req, res) => {
    try {
      const { q, page = 1, pageSize = 20 } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
      const offset = (pg - 1) * ps;

      const query = db('donors')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('name', 'like', `%${q}%`)
                .orWhere('mobile_number', 'like', `%${q}%`)
                .orWhere('email', 'like', `%${q}%`);
            });
          }
        })
        .orderBy('created_at', 'desc')
        .limit(ps)
        .offset(offset);

      const rows = await query;
      
      // Get total count
      const countQuery = db('donors')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('name', 'like', `%${q}%`)
                .orWhere('mobile_number', 'like', `%${q}%`);
            });
          }
        });
      const totalResult = await countQuery.count({ count: '*' }).first();
      const total = totalResult?.count || 0;
      
      res.json({ success: true, data: rows, total, page: pg, pageSize: ps });
    } catch (err) {
      console.error('GET /api/annadhanam/donors error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single donor
  router.get('/donors/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const donor = await db('donors')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!donor) {
        return res.status(404).json({ error: 'Donor not found' });
      }
      
      // Get donor's annadhanam history
      const history = await db('annadhanam')
        .where({ donor_id: id, temple_id: req.user.templeId })
        .orderBy('from_date', 'desc')
        .limit(10);
      
      res.json({ success: true, data: { ...donor, history } });
    } catch (err) {
      console.error('GET /api/annadhanam/donors/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create or update donor (Donor Available flow from flowchart)
  router.post('/donors', async (req, res) => {
    try {
      const { name, mobile_number, email, address, city, state, pincode, donor_type, is_walk_in } = req.body;
      
      if (!name || !mobile_number) {
        return res.status(400).json({ error: 'Name and mobile number are required' });
      }
      
      // Check if donor already exists by mobile
      let donor = await db('donors')
        .where({ mobile_number, temple_id: req.user.templeId })
        .first();
      
      if (donor) {
        // Update existing donor
        await db('donors')
          .where({ id: donor.id })
          .update({
            name,
            email: email || donor.email,
            address: address || donor.address,
            city: city || donor.city,
            state: state || donor.state,
            pincode: pincode || donor.pincode,
            donor_type: donor_type || donor.donor_type,
            is_walk_in: is_walk_in !== undefined ? is_walk_in : donor.is_walk_in,
            updated_at: db.fn.now()
          });
        
        donor = await db('donors').where({ id: donor.id }).first();
        return res.json({ success: true, data: donor, message: 'Donor updated' });
      }
      
      // Create new donor
      const [donorId] = await db('donors').insert({
        temple_id: req.user.templeId,
        name,
        mobile_number,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        donor_type: donor_type || 'individual',
        is_walk_in: is_walk_in || false,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      
      donor = await db('donors').where({ id: donorId }).first();
      res.json({ success: true, data: donor, message: 'Donor created' });
    } catch (err) {
      console.error('POST /api/annadhanam/donors error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update donor
  router.put('/donors/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, mobile_number, email, address, city, state, pincode, donor_type } = req.body;
      
      const donor = await db('donors')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!donor) {
        return res.status(404).json({ error: 'Donor not found' });
      }
      
      await db('donors')
        .where({ id })
        .update({
          name: name || donor.name,
          mobile_number: mobile_number || donor.mobile_number,
          email: email !== undefined ? email : donor.email,
          address: address !== undefined ? address : donor.address,
          city: city !== undefined ? city : donor.city,
          state: state !== undefined ? state : donor.state,
          pincode: pincode !== undefined ? pincode : donor.pincode,
          donor_type: donor_type || donor.donor_type,
          updated_at: db.fn.now()
        });
      
      const updated = await db('donors').where({ id }).first();
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('PUT /api/annadhanam/donors/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==========================================
  // MEAL PACKAGES ENDPOINTS
  // ==========================================
  
  // List meal packages
  router.get('/packages', async (req, res) => {
    try {
      const { meal_time, is_active } = req.query;
      
      let query = db('meal_packages')
        .where('temple_id', req.user.templeId);
      
      if (meal_time) query = query.andWhere('meal_time', meal_time);
      if (is_active !== undefined) query = query.andWhere('is_active', is_active);
      
      const packages = await query.orderBy('name');
      res.json({ success: true, data: packages });
    } catch (err) {
      console.error('GET /api/annadhanam/packages error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create meal package
  router.post('/packages', async (req, res) => {
    try {
      const { name, description, base_price, price_per_person, meal_time, min_people, max_people } = req.body;
      
      if (!name || !meal_time) {
        return res.status(400).json({ error: 'Name and meal_time are required' });
      }
      
      const [packageId] = await db('meal_packages').insert({
        temple_id: req.user.templeId,
        name,
        description: description || null,
        base_price: base_price || 0,
        price_per_person: price_per_person || 0,
        meal_time,
        min_people: min_people || 1,
        max_people: max_people || 1000,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      
      const pkg = await db('meal_packages').where({ id: packageId }).first();
      res.json({ success: true, data: pkg });
    } catch (err) {
      console.error('POST /api/annadhanam/packages error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update meal package
  router.put('/packages/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const pkg = await db('meal_packages')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }
      
      await db('meal_packages')
        .where({ id })
        .update({
          ...updates,
          updated_at: db.fn.now()
        });
      
      const updated = await db('meal_packages').where({ id }).first();
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('PUT /api/annadhanam/packages/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==========================================
  // MEAL SLOTS ENDPOINTS
  // ==========================================
  
  // Check slot availability (Flowchart: Check Availability)
  router.get('/slots/check', async (req, res) => {
    try {
      const { slot_date, meal_time, people_count } = req.query;
      
      if (!slot_date || !meal_time) {
        return res.status(400).json({ error: 'slot_date and meal_time are required' });
      }
      
      const requestedCount = parseInt(people_count) || 1;
      
      const availability = await checkSlotAvailability(
        db, 
        req.user.templeId, 
        slot_date, 
        meal_time, 
        requestedCount
      );
      
      // Get alternative slots if not available
      let alternatives = [];
      if (!availability.available) {
        const date = new Date(slot_date);
        const nextDays = [];
        for (let i = 1; i <= 7; i++) {
          const nextDate = new Date(date);
          nextDate.setDate(date.getDate() + i);
          nextDays.push(nextDate.toISOString().split('T')[0]);
        }
        
        alternatives = await db('meal_slots')
          .whereIn('slot_date', nextDays)
          .where({ meal_time, temple_id: req.user.templeId, is_available: 1 })
          .where('available_count', '>=', requestedCount)
          .orderBy('slot_date')
          .limit(5);
      }
      
      res.json({
        success: true,
        available: availability.available,
        availableCount: availability.availableCount,
        message: availability.message,
        alternatives: alternatives
      });
    } catch (err) {
      console.error('GET /api/annadhanam/slots/check error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get slots for a date range
  router.get('/slots', async (req, res) => {
    try {
      const { from_date, to_date, meal_time } = req.query;
      
      let query = db('meal_slots')
        .where('temple_id', req.user.templeId);
      
      if (from_date) query = query.andWhere('slot_date', '>=', from_date);
      if (to_date) query = query.andWhere('slot_date', '<=', to_date);
      if (meal_time) query = query.andWhere('meal_time', meal_time);
      
      const slots = await query.orderBy('slot_date').orderBy('meal_time');
      res.json({ success: true, data: slots });
    } catch (err) {
      console.error('GET /api/annadhanam/slots error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create or update slot (admin only)
  router.post('/slots', async (req, res) => {
    try {
      const { slot_date, meal_time, total_capacity, is_available, special_instructions } = req.body;
      
      if (!slot_date || !meal_time) {
        return res.status(400).json({ error: 'slot_date and meal_time are required' });
      }
      
      // Check if slot exists
      let slot = await db('meal_slots')
        .where({ 
          temple_id: req.user.templeId, 
          slot_date, 
          meal_time 
        })
        .first();
      
      if (slot) {
        // Update existing
        await db('meal_slots')
          .where({ id: slot.id })
          .update({
            total_capacity: total_capacity || slot.total_capacity,
            available_count: total_capacity ? total_capacity - (slot.booked_count || 0) : slot.available_count,
            is_available: is_available !== undefined ? is_available : slot.is_available,
            special_instructions: special_instructions !== undefined ? special_instructions : slot.special_instructions,
            updated_at: db.fn.now()
          });
        
        slot = await db('meal_slots').where({ id: slot.id }).first();
        return res.json({ success: true, data: slot, message: 'Slot updated' });
      }
      
      // Create new slot
      const [slotId] = await db('meal_slots').insert({
        temple_id: req.user.templeId,
        slot_date,
        meal_time,
        total_capacity: total_capacity || 100,
        booked_count: 0,
        available_count: total_capacity || 100,
        is_available: is_available !== undefined ? is_available : true,
        special_instructions: special_instructions || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      
      slot = await db('meal_slots').where({ id: slotId }).first();
      res.json({ success: true, data: slot, message: 'Slot created' });
    } catch (err) {
      console.error('POST /api/annadhanam/slots error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==========================================
  // CALCULATE AMOUNT (Flowchart: Calculate Amount)
  // ==========================================
  
  router.post('/calculate-amount', async (req, res) => {
    try {
      const { package_id, people_count } = req.body;
      
      if (!package_id || !people_count) {
        return res.status(400).json({ error: 'package_id and people_count are required' });
      }
      
      const amount = await calculateAmount(db, package_id, people_count, req.user.templeId);
      
      const pkg = await db('meal_packages')
        .where({ id: package_id, temple_id: req.user.templeId })
        .first();
      
      res.json({
        success: true,
        data: {
          package_id,
          people_count,
          calculated_amount: amount,
          package_details: pkg
        }
      });
    } catch (err) {
      console.error('POST /api/annadhanam/calculate-amount error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==========================================
  // ENHANCED ANNADHANAM BOOKING
  // ==========================================
  
  // Create booking with full flowchart workflow
  router.post('/book', async (req, res) => {
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
        is_walk_in,
        booking_source
      } = req.body;
      
      // Validation
      if (!name || !mobile_number || !time || !from_date || !to_date || !peoples) {
        return res.status(400).json({
          error: 'Missing required fields: name, mobile_number, time, from_date, to_date, peoples'
        });
      }
      
      if (new Date(from_date) > new Date(to_date)) {
        return res.status(400).json({ error: 'From date cannot be later than to date' });
      }
      
      if (!/^[0-9]{10}$/.test(mobile_number)) {
        return res.status(400).json({ error: 'Mobile number must be 10 digits' });
      }
      
      const peopleCount = parseInt(peoples);
      if (isNaN(peopleCount) || peopleCount < 1) {
        return res.status(400).json({ error: 'Number of people must be at least 1' });
      }
      
      // Check slot availability (Flowchart: Slot Available?)
      const availability = await checkSlotAvailability(
        db,
        req.user.templeId,
        from_date,
        time,
        peopleCount
      );
      
      if (!availability.available) {
        return res.status(400).json({
          error: 'Slot not available',
          message: availability.message,
          available_count: availability.availableCount
        });
      }
      
      // Handle donor (Flowchart: Donor Available?)
      let finalDonorId = donor_id;
      
      if (!finalDonorId) {
        // Check if donor exists by mobile
        let donor = await db('donors')
          .where({ mobile_number, temple_id: req.user.templeId })
          .first();
        
        if (!donor) {
          // Create new donor (Flowchart: Save Donor)
          const [newDonorId] = await db('donors').insert({
            temple_id: req.user.templeId,
            name,
            mobile_number,
            email: email || null,
            address: address || null,
            donor_type: is_walk_in ? 'walk_in' : 'individual',
            is_walk_in: is_walk_in || false,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
          finalDonorId = newDonorId;
        } else {
          finalDonorId = donor.id;
          // Update donor info
          await db('donors')
            .where({ id: donor.id })
            .update({
              name,
              email: email || donor.email,
              address: address || donor.address,
              updated_at: db.fn.now()
            });
        }
      }
      
      // Calculate amount (Flowchart: Calculate Amount)
      let calculatedAmount = 0;
      if (package_id) {
        calculatedAmount = await calculateAmount(db, package_id, peopleCount, req.user.templeId);
      }
      
      // Create booking (Flowchart: Show Summary)
      const receiptNumber = await generateReceiptNumber(db, req.user.templeId);
      
      const record = {
        temple_id: req.user.templeId,
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
        booking_source: booking_source || 'web',
        is_walk_in: is_walk_in || false,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      };
      
      const [insertedId] = await db('annadhanam').insert(record);
      
      // Update slot booking count (Flowchart: Update Meal Slots)
      await updateSlotBooking(db, req.user.templeId, from_date, time, peopleCount);
      
      // Log creation
      await logAnnadhanamAction({
        annadhanamId: insertedId,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'create',
        details: { ...record, id: insertedId }
      });
      
      const createdRow = await db('annadhanam').where({ id: insertedId }).first();
      
      res.json({
        success: true,
        data: createdRow,
        message: 'Booking created successfully. Awaiting confirmation.'
      });
    } catch (err) {
      console.error('POST /api/annadhanam/book error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Confirm booking (Flowchart: Confirm)
  router.put('/:id/confirm', async (req, res) => {
    try {
      const { id } = req.params;
      
      const booking = await db('annadhanam')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      await db('annadhanam')
        .where({ id })
        .update({
          confirmation_status: 'confirmed',
          updated_at: db.fn.now()
        });
      
      await logAnnadhanamAction({
        annadhanamId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'confirm',
        details: { before: booking, after: { ...booking, confirmation_status: 'confirmed' } }
      });
      
      const updated = await db('annadhanam').where({ id }).first();
      
      res.json({
        success: true,
        data: updated,
        message: 'Booking confirmed. Generate receipt and proceed with service delivery.'
      });
    } catch (err) {
      console.error('PUT /api/annadhanam/:id/confirm error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Mark as delivered (Flowchart: Service Delivery)
  router.put('/:id/deliver', async (req, res) => {
    try {
      const { id } = req.params;
      const { delivery_notes } = req.body;
      
      const booking = await db('annadhanam')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (booking.confirmation_status !== 'confirmed') {
        return res.status(400).json({ error: 'Booking must be confirmed before delivery' });
      }
      
      await db('annadhanam')
        .where({ id })
        .update({
          service_status: 'delivered',
          remarks: delivery_notes ? `${booking.remarks || ''} | Delivery: ${delivery_notes}` : booking.remarks,
          updated_at: db.fn.now()
        });
      
      await logAnnadhanamAction({
        annadhanamId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'deliver',
        details: { delivery_notes, delivered_at: new Date() }
      });
      
      const updated = await db('annadhanam').where({ id }).first();
      
      res.json({
        success: true,
        data: updated,
        message: 'Service marked as delivered. Collect feedback to complete.'
      });
    } catch (err) {
      console.error('PUT /api/annadhanam/:id/deliver error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Mark as completed (Flowchart: Mark Completed)
  router.put('/:id/complete', async (req, res) => {
    try {
      const { id } = req.params;
      
      const booking = await db('annadhanam')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (booking.service_status !== 'delivered') {
        return res.status(400).json({ error: 'Service must be delivered before completion' });
      }
      
      await db('annadhanam')
        .where({ id })
        .update({
          service_status: 'completed',
          updated_at: db.fn.now()
        });
      
      await logAnnadhanamAction({
        annadhanamId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'complete',
        details: { completed_at: new Date() }
      });
      
      const updated = await db('annadhanam').where({ id }).first();
      
      res.json({
        success: true,
        data: updated,
        message: 'Service completed successfully.'
      });
    } catch (err) {
      console.error('PUT /api/annadhanam/:id/complete error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==========================================
  // FEEDBACK ENDPOINTS (Flowchart: Collect Feedback)
  // ==========================================
  
  // Submit feedback
  router.post('/:id/feedback', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        rating,
        feedback_text,
        food_quality_rating,
        service_rating,
        cleanliness_rating,
        would_recommend
      } = req.body;
      
      const booking = await db('annadhanam')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Check if feedback already exists
      const existingFeedback = await db('annadhanam_feedback')
        .where({ annadhanam_id: id, temple_id: req.user.templeId })
        .first();
      
      if (existingFeedback) {
        return res.status(400).json({ error: 'Feedback already submitted for this booking' });
      }
      
      const [feedbackId] = await db('annadhanam_feedback').insert({
        temple_id: req.user.templeId,
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
      
      // Update records (Flowchart: Update Records)
      await db('annadhanam')
        .where({ id })
        .update({
          remarks: booking.remarks 
            ? `${booking.remarks} | Feedback: ${rating}/5 stars` 
            : `Feedback: ${rating}/5 stars`,
          updated_at: db.fn.now()
        });
      
      const feedback = await db('annadhanam_feedback').where({ id: feedbackId }).first();
      
      res.json({
        success: true,
        data: feedback,
        message: 'Feedback submitted successfully. Thank you!'
      });
    } catch (err) {
      console.error('POST /api/annadhanam/:id/feedback error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get feedback for a booking
  router.get('/:id/feedback', async (req, res) => {
    try {
      const { id } = req.params;
      
      const feedback = await db('annadhanam_feedback')
        .where({ annadhanam_id: id, temple_id: req.user.templeId })
        .first();
      
      if (!feedback) {
        return res.status(404).json({ error: 'Feedback not found' });
      }
      
      res.json({ success: true, data: feedback });
    } catch (err) {
      console.error('GET /api/annadhanam/:id/feedback error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all feedback (with filters)
  router.get('/feedback/all', async (req, res) => {
    try {
      const { from_date, to_date, min_rating } = req.query;
      
      let query = db('annadhanam_feedback as f')
        .join('annadhanam as a', 'f.annadhanam_id', 'a.id')
        .where('f.temple_id', req.user.templeId)
        .select(
          'f.*',
          'a.name as donor_name',
          'a.receipt_number',
          'a.from_date as service_date'
        );
      
      if (from_date) query = query.andWhere('a.from_date', '>=', from_date);
      if (to_date) query = query.andWhere('a.from_date', '<=', to_date);
      if (min_rating) query = query.andWhere('f.rating', '>=', min_rating);
      
      const feedback = await query.orderBy('f.created_at', 'desc');
      
      // Calculate statistics
      const stats = await db('annadhanam_feedback')
        .where('temple_id', req.user.templeId)
        .select(
          db.raw('COUNT(*) as total_feedback'),
          db.raw('AVG(rating) as average_rating'),
          db.raw('COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback'),
          db.raw('COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback')
        )
        .first();
      
      res.json({
        success: true,
        data: feedback,
        statistics: stats
      });
    } catch (err) {
      console.error('GET /api/annadhanam/feedback/all error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==========================================
  // LEGACY ENDPOINTS (Backward Compatibility)
  // ==========================================
  
  // List all annadhanam entries (enhanced with joins)
  router.get('/', async (req, res) => {
    try {
      const { q, from, to, status, page = 1, pageSize = 20 } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
      const offset = (pg - 1) * ps;

      let query = db('annadhanam as a')
        .leftJoin('donors as d', 'a.donor_id', 'd.id')
        .leftJoin('meal_packages as p', 'a.package_id', 'p.id')
        .where('a.temple_id', req.user.templeId)
        .select(
          'a.*',
          'd.name as donor_name',
          'd.email as donor_email',
          'd.address as donor_address',
          'p.name as package_name',
          'p.base_price',
          'p.price_per_person'
        )
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('a.name', 'like', `%${q}%`)
                .orWhere('a.receipt_number', 'like', `%${q}%`)
                .orWhere('a.mobile_number', 'like', `%${q}%`)
                .orWhere('d.name', 'like', `%${q}%`);
            });
          }
          if (from) qb.andWhere('a.from_date', '>=', from);
          if (to) qb.andWhere('a.to_date', '<=', to);
          if (status) qb.andWhere('a.service_status', status);
        })
        .orderBy('a.from_date', 'desc')
        .limit(ps)
        .offset(offset);

      const rows = await query;
      
      // Get total count
      const countQuery = db('annadhanam')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('name', 'like', `%${q}%`)
                .orWhere('receipt_number', 'like', `%${q}%`)
                .orWhere('mobile_number', 'like', `%${q}%`);
            });
          }
          if (from) qb.andWhere('from_date', '>=', from);
          if (to) qb.andWhere('to_date', '<=', to);
          if (status) qb.andWhere('service_status', status);
        });
      const totalResult = await countQuery.count({ count: '*' }).first();
      const total = totalResult?.count || 0;
      
      res.json({ success: true, data: rows, total, page: pg, pageSize: ps });
    } catch (err) {
      console.error('GET /api/annadhanam error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single entry
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const row = await db('annadhanam as a')
        .leftJoin('donors as d', 'a.donor_id', 'd.id')
        .leftJoin('meal_packages as p', 'a.package_id', 'p.id')
        .where({ 'a.id': id, 'a.temple_id': req.user.templeId })
        .select(
          'a.*',
          'd.name as donor_name',
          'd.email as donor_email',
          'd.address as donor_address',
          'd.city as donor_city',
          'd.state as donor_state',
          'p.name as package_name',
          'p.description as package_description',
          'p.base_price',
          'p.price_per_person'
        )
        .first();
      
      if (!row) {
        return res.status(404).json({ error: 'Annadhanam entry not found' });
      }
      
      // Get feedback if exists
      const feedback = await db('annadhanam_feedback')
        .where({ annadhanam_id: id, temple_id: req.user.templeId })
        .first();
      
      res.json({ success: true, data: { ...row, feedback } });
    } catch (err) {
      console.error('GET /api/annadhanam/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update entry
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      
      const existing = await db('annadhanam')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!existing) {
        return res.status(404).json({ error: 'Annadhanam entry not found' });
      }
      
      // Recalculate amount if package or people count changed
      let calculatedAmount = existing.calculated_amount;
      if (body.package_id || body.peoples) {
        const packageId = body.package_id || existing.package_id;
        const peopleCount = body.peoples || existing.peoples;
        if (packageId) {
          calculatedAmount = await calculateAmount(db, packageId, peopleCount, req.user.templeId);
        }
      }
      
      const updateData = {
        ...body,
        calculated_amount: calculatedAmount,
        updated_at: db.fn.now()
      };
      
      await db('annadhanam').where({ id }).update(updateData);
      
      const updated = await db('annadhanam').where({ id }).first();
      
      await logAnnadhanamAction({
        annadhanamId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'update',
        details: { before: existing, after: updated }
      });
      
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('PUT /api/annadhanam/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete entry
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const existing = await db('annadhanam')
        .where({ id, temple_id: req.user.templeId })
        .first();
      
      if (!existing) {
        return res.status(404).json({ error: 'Annadhanam entry not found' });
      }
      
      // Release slot booking
      if (existing.from_date && existing.time && existing.peoples) {
        await updateSlotBooking(
          db,
          req.user.templeId,
          existing.from_date,
          existing.time,
          existing.peoples,
          true // is cancellation
        );
      }
      
      await db('annadhanam').where({ id }).del();
      
      await logAnnadhanamAction({
        annadhanamId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'delete',
        details: { deleted: existing }
      });
      
      res.json({ success: true, message: 'Entry deleted successfully' });
    } catch (err) {
      console.error('DELETE /api/annadhanam/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==========================================
  // STATISTICS & REPORTS
  // ==========================================
  
  // Get dashboard statistics
  router.get('/stats/dashboard', async (req, res) => {
    try {
      const { from, to } = req.query;
      
      let baseQuery = db('annadhanam').where('temple_id', req.user.templeId);
      
      if (from) baseQuery = baseQuery.andWhere('from_date', '>=', from);
      if (to) baseQuery = baseQuery.andWhere('to_date', '<=', to);
      
      // Overall stats
      const overallStats = await baseQuery.clone()
        .select(
          db.raw('COUNT(*) as total_bookings'),
          db.raw('SUM(peoples) as total_people_served'),
          db.raw('SUM(calculated_amount) as total_amount'),
          db.raw('COUNT(CASE WHEN confirmation_status = \"confirmed\" THEN 1 END) as confirmed_bookings'),
          db.raw('COUNT(CASE WHEN service_status = \"completed\" THEN 1 END) as completed_services'),
          db.raw('COUNT(CASE WHEN service_status = \"delivered\" THEN 1 END) as delivered_services'),
          db.raw('COUNT(CASE WHEN is_walk_in = 1 THEN 1 END) as walk_in_count')
        )
        .first();
      
      // Package breakdown
      const packageStats = await db('annadhanam as a')
        .join('meal_packages as p', 'a.package_id', 'p.id')
        .where('a.temple_id', req.user.templeId)
        .modify((qb) => {
          if (from) qb.andWhere('a.from_date', '>=', from);
          if (to) qb.andWhere('a.to_date', '<=', to);
        })
        .groupBy('p.name')
        .select(
          'p.name as package_name',
          db.raw('COUNT(*) as booking_count'),
          db.raw('SUM(a.peoples) as people_count'),
          db.raw('SUM(a.calculated_amount) as revenue')
        );
      
      // Daily breakdown
      const dailyStats = await baseQuery.clone()
        .groupBy('from_date')
        .select(
          'from_date as date',
          db.raw('COUNT(*) as bookings'),
          db.raw('SUM(peoples) as people_served')
        )
        .orderBy('from_date', 'desc')
        .limit(30);
      
      res.json({
        success: true,
        data: {
          overall: overallStats,
          by_package: packageStats,
          daily: dailyStats
        }
      });
    } catch (err) {
      console.error('GET /api/annadhanam/stats/dashboard error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
