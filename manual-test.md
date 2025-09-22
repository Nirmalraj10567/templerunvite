# Manual Test for Hall Journal Mirroring

## Step 1: Start Backend
```bash
cd "c:\Users\nirma\Documents\sample\maintemple 4\maintemple\server"
node backend.js
```

**Expected output:**
- "Server running on port 4000"
- No error messages

## Step 2: Test Hall Booking Creation

### Option A: Using curl (if available)
```bash
curl -X POST "https://tmsapi.xesstechlink.com/api/hall-bookings" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibW9iaWxlIjoiOTk5OTk5OTk4OSIsInVzZXJuYW1lIjoibXVydWdhbjkiLCJ0ZW1wbGVJZCI6Miwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4NDM2MDQ3LCJleHAiOjE3ODk5NzIwNDd9.ZwTcS5KTF-w2E4oL0dpInnKE7kmy8AlgoTPClJQWGTA" \
  -H "Content-Type: application/json" \
  -d '{
    "registerNo": "2025-TEST-001",
    "date": "2025-09-21",
    "time": "12:30",
    "event": "Test Event",
    "name": "Test User",
    "mobile": "9999999999",
    "advanceAmount": "100.00",
    "totalAmount": "500.00",
    "balanceAmount": "400.00",
    "remarks": "Test hall booking",
    "transferTo": "INCOME A/C",
    "fromAccount": "HALL ENTRY A/C",
    "amount": "100.00"
  }'
```

### Option B: Using the UI
1. Open the Hall Entry page in your browser
2. Fill in the form with:
   - Date: 2025-09-21
   - Time: 12:30
   - Event: Test Event
   - Name: Test User
   - Mobile: 9999999999
   - Advance: 100.00
   - Total: 500.00
   - Remarks: Test hall booking
3. Click Save

## Step 3: Check Backend Console

**Look for these debug messages:**
```
🔍 Hall booking journal mirror debug: {
  advanceAmount: '100.00',
  totalAmount: '500.00',
  amount: '100.00',
  bookingId: [some number],
  templeId: 2
}

💰 Amount processing: {
  advanceAmount: '100.00',
  totalAmount: '500.00',
  parsedAmount: 100,
  isValid: true
}

✅ Journal entry created for hall booking [id]: HALL A/C → INCOME A/C (₹100)
```

## Step 4: Check Journal Entries

### Option A: Using curl
```bash
curl "https://tmsapi.xesstechlink.com/api/journal/entries?startDate=2025-09-21&endDate=2025-09-21&excludeZero=1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibW9iaWxlIjoiOTk5OTk5OTk4OSIsInVzZXJuYW1lIjoibXVydWdhbjkiLCJ0ZW1wbGVJZCI6Miwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4NDM2MDQ3LCJleHAiOjE3ODk5NzIwNDd9.ZwTcS5KTF-w2E4oL0dpInnKE7kmy8AlgoTPClJQWGTA"
```

### Option B: Using the UI
1. Go to Reports → Journal Log
2. Set date range to include 2025-09-21
3. Click Refresh
4. Look for entries with:
   - from_account: "HALL A/C"
   - to_account: "INCOME A/C"
   - amount: 100.00
   - reference_type: "hall_booking"

## Troubleshooting

### If backend won't start:
- Check if MySQL is running
- Check database credentials in `server/env`
- Look for error messages in console

### If no debug messages appear:
- The request might not be reaching the backend
- Check if the URL is correct (localhost:4000)
- Verify the Authorization token is valid

### If debug shows "No valid amount":
- Check that advanceAmount or totalAmount > 0
- Verify the form is sending the correct field names

### If debug shows "Journal entries table does not exist":
- The database might not have the journal_entries table
- Check your database schema

### If journal entries don't appear in UI:
- Check the date range includes the booking date
- Try removing the excludeZero filter
- Check if the temple_id matches your user's temple

## Expected Final Result

You should see a journal entry like:
```json
{
  "id": 123,
  "date": "2025-09-21",
  "from_account": "HALL A/C",
  "to_account": "INCOME A/C",
  "amount": 100.00,
  "entry_type": "transfer",
  "remarks": "Hall booking payment - Test User",
  "reference_type": "hall_booking",
  "reference_id": [booking_id],
  "temple_id": 2
}
```
