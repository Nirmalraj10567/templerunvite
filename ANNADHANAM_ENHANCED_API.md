# Annadhanam Enhanced API Documentation

Based on `annadhanam-free-meal-service-flow.png` flowchart implementation.

## Overview

The enhanced Annadhanam API implements the complete meal donation booking workflow as per the flowchart, including:
- Donor management (registered and walk-in)
- Meal slot availability checking
- Package selection (Breakfast/Lunch/Dinner/Custom)
- Amount calculation
- Service delivery tracking
- Feedback collection

## New Database Tables

### 1. `donors`
Stores donor information separately from bookings.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `temple_id` | INTEGER | Temple reference |
| `name` | TEXT | Donor name |
| `mobile_number` | TEXT | 10-digit mobile |
| `email` | TEXT | Email address |
| `address` | TEXT | Full address |
| `city` | TEXT | City |
| `state` | TEXT | State |
| `pincode` | TEXT | Pincode |
| `donor_type` | TEXT | individual/organization/walk_in |
| `is_walk_in` | BOOLEAN | Walk-in flag |

### 2. `meal_packages`
Meal packages with pricing.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `name` | TEXT | Breakfast/Lunch/Dinner/Custom |
| `description` | TEXT | Package details |
| `base_price` | DECIMAL | Fixed base cost |
| `price_per_person` | DECIMAL | Per person cost |
| `meal_time` | TEXT | breakfast/lunch/dinner |
| `min_people` | INTEGER | Minimum people |
| `max_people` | INTEGER | Maximum people |

### 3. `meal_slots`
Availability tracking per date and time.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `slot_date` | DATE | Date |
| `meal_time` | TEXT | breakfast/lunch/dinner |
| `total_capacity` | INTEGER | Total slots |
| `booked_count` | INTEGER | Booked slots |
| `available_count` | INTEGER | Available slots |
| `is_available` | BOOLEAN | Availability flag |

### 4. `annadhanam_feedback`
Post-service feedback collection.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `annadhanam_id` | INTEGER | Booking reference |
| `rating` | INTEGER | 1-5 overall rating |
| `food_quality_rating` | INTEGER | 1-5 food rating |
| `service_rating` | INTEGER | 1-5 service rating |
| `cleanliness_rating` | INTEGER | 1-5 cleanliness rating |
| `feedback_text` | TEXT | Comments |
| `would_recommend` | BOOLEAN | Recommendation |

## API Endpoints

### Web API (`/api/annadhanam-enhanced`)

#### Donor Management

**List Donors**
```
GET /api/annadhanam-enhanced/donors?q=search&page=1&pageSize=20
```

**Get Donor Details**
```
GET /api/annadhanam-enhanced/donors/:id
```

**Create/Update Donor**
```
POST /api/annadhanam-enhanced/donors
{
  "name": "John Doe",
  "mobile_number": "9876543210",
  "email": "john@example.com",
  "address": "123 Temple Street",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "donor_type": "individual",
  "is_walk_in": false
}
```

#### Meal Packages

**List Packages**
```
GET /api/annadhanam-enhanced/packages?meal_time=lunch
```

**Create Package**
```
POST /api/annadhanam-enhanced/packages
{
  "name": "Special Lunch",
  "description": "Festive meal package",
  "base_price": 2000,
  "price_per_person": 100,
  "meal_time": "lunch",
  "min_people": 20,
  "max_people": 500
}
```

#### Meal Slots

**Check Availability**
```
GET /api/annadhanam-enhanced/slots/check?slot_date=2025-04-15&meal_time=lunch&people_count=50
```

Response:
```json
{
  "success": true,
  "available": true,
  "availableCount": 75,
  "message": "Slot available",
  "alternatives": [] // Populated if not available
}
```

**Create/Update Slot**
```
POST /api/annadhanam-enhanced/slots
{
  "slot_date": "2025-04-15",
  "meal_time": "lunch",
  "total_capacity": 100,
  "is_available": true,
  "special_instructions": "Special festival arrangements"
}
```

#### Booking Workflow

**Calculate Amount**
```
POST /api/annadhanam-enhanced/calculate-amount
{
  "package_id": 1,
  "people_count": 50
}
```

**Create Booking**
```
POST /api/annadhanam-enhanced/book
{
  "donor_id": 1, // optional
  "name": "John Doe",
  "mobile_number": "9876543210",
  "package_id": 1,
  "peoples": 50,
  "time": "lunch",
  "from_date": "2025-04-15",
  "to_date": "2025-04-15",
  "remarks": "Anniversary celebration",
  "special_instructions": "Extra sweets needed",
  "is_walk_in": false,
  "booking_source": "web"
}
```

**Confirm Booking**
```
PUT /api/annadhanam-enhanced/:id/confirm
```

**Mark as Delivered**
```
PUT /api/annadhanam-enhanced/:id/deliver
{
  "delivery_notes": "Delivered successfully at 1:30 PM"
}
```

**Mark as Completed**
```
PUT /api/annadhanam-enhanced/:id/complete
```

#### Feedback

**Submit Feedback**
```
POST /api/annadhanam-enhanced/:id/feedback
{
  "rating": 5,
  "feedback_text": "Excellent service and food quality",
  "food_quality_rating": 5,
  "service_rating": 5,
  "cleanliness_rating": 5,
  "would_recommend": true
}
```

**Get All Feedback**
```
GET /api/annadhanam-enhanced/feedback/all?from_date=2025-04-01&to_date=2025-04-30
```

**Get Feedback Statistics**
```json
{
  "success": true,
  "data": [...],
  "statistics": {
    "total_feedback": 150,
    "average_rating": 4.5,
    "positive_feedback": 120,
    "negative_feedback": 10
  }
}
```

#### Reports

**Dashboard Statistics**
```
GET /api/annadhanam-enhanced/stats/dashboard?from=2025-04-01&to=2025-04-30
```

Response:
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_bookings": 250,
      "total_people_served": 12500,
      "total_amount": 150000.00,
      "confirmed_bookings": 200,
      "completed_services": 180,
      "walk_in_count": 30
    },
    "by_package": [
      {
        "package_name": "Lunch",
        "booking_count": 150,
        "people_count": 8000,
        "revenue": 100000.00
      }
    ],
    "daily": [
      {
        "date": "2025-04-10",
        "bookings": 10,
        "people_served": 500
      }
    ]
  }
}
```

### Mobile API (`/api/annadhanam-mobile-enhanced`)

#### Booking Workflow

**Step 1: Check/Create Donor**
```
POST /api/annadhanam-mobile-enhanced/check-donor
{
  "mobile_number": "9876543210",
  "name": "John Doe",
  "email": "john@example.com",
  "address": "123 Temple Street",
  "temple_id": 1
}
```

Response:
```json
{
  "success": true,
  "exists": true,
  "data": { "id": 1, "name": "John Doe", ... },
  "message": "Existing donor found"
}
```

**Step 2: Get Available Slots**
```
GET /api/annadhanam-mobile-enhanced/available-slots?date=2025-04-15&meal_time=lunch&people_count=50&temple_id=1
```

**Step 3: Get Packages**
```
GET /api/annadhanam-mobile-enhanced/packages?meal_time=lunch&temple_id=1
```

**Step 4: Calculate Amount**
```
POST /api/annadhanam-mobile-enhanced/calculate
{
  "package_id": 1,
  "people_count": 50,
  "temple_id": 1
}
```

**Step 5: Submit Booking**
```
POST /api/annadhanam-mobile-enhanced/submit
{
  "donor_id": 1,
  "name": "John Doe",
  "mobile_number": "9876543210",
  "package_id": 1,
  "peoples": 50,
  "time": "lunch",
  "from_date": "2025-04-15",
  "to_date": "2025-04-15",
  "remarks": "Birthday celebration",
  "special_instructions": "Extra dessert",
  "temple_id": 1
}
```

**Get My Bookings**
```
GET /api/annadhanam-mobile-enhanced/my-bookings?mobile_number=9876543210&temple_id=1
```

**Submit Feedback**
```
POST /api/annadhanam-mobile-enhanced/:id/feedback
{
  "mobile_number": "9876543210",
  "rating": 5,
  "feedback_text": "Great service!",
  "food_quality_rating": 5,
  "service_rating": 5
}
```

**Cancel Booking**
```
PUT /api/annadhanam-mobile-enhanced/:id/cancel
{
  "mobile_number": "9876543210",
  "reason": "Change of plans"
}
```

## Migration

Run the migration to create new tables:

**SQLite:**
```bash
sqlite3 database.db < server/migrations/20250410_create_annadhanam_enhanced_tables.sql
```

**MySQL:**
```bash
mysql -u username -p database < server/migrations/20250410_create_annadhanam_enhanced_tables_mysql.sql
```

## Default Packages

The migration automatically creates 4 default packages:

| Package | Meal Time | Base Price | Per Person | Min People | Max People |
|---------|-----------|------------|------------|------------|------------|
| Breakfast | breakfast | ₹1,000 | ₹50 | 10 | 500 |
| Lunch | lunch | ₹2,000 | ₹75 | 10 | 1,000 |
| Dinner | dinner | ₹1,500 | ₹60 | 10 | 500 |
| Custom | custom | ₹0 | ₹0 | 1 | 2,000 |

## Workflow States

### Confirmation Status
- `pending` - Awaiting confirmation
- `confirmed` - Booking confirmed
- `cancelled` - Booking cancelled

### Service Status
- `pending` - Not yet delivered
- `delivered` - Food delivered
- `completed` - Service completed with feedback

## Permissions

New permission added: `annadhanam_meal_management`
- Allows managing meal packages and slots
- Admin: full access
- Member: view only

## Integration

The enhanced API works alongside the existing Annadhanam API. To migrate to the new workflow:

1. Run database migrations
2. Update frontend to use new endpoints
3. Default packages are automatically created
4. Existing data remains compatible

## Testing

Example cURL commands:

```bash
# Check donor
curl -X POST http://localhost:3000/api/annadhanam-mobile-enhanced/check-donor \
  -H "Content-Type: application/json" \
  -d '{"mobile_number":"9876543210","name":"Test User","temple_id":1}'

# Check slot availability
curl "http://localhost:3000/api/annadhanam-mobile-enhanced/available-slots?date=2025-04-15&meal_time=lunch&people_count=50&temple_id=1"

# Submit booking
curl -X POST http://localhost:3000/api/annadhanam-mobile-enhanced/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","mobile_number":"9876543210","package_id":1,"peoples":50,"time":"lunch","from_date":"2025-04-15","to_date":"2025-04-15","temple_id":1}'
```
