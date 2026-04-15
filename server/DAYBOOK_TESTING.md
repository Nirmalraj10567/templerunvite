# Daybook API Documentation & Testing Guide

## Overview
The Daybook module provides a comprehensive daily transaction management system for temple finances. It supports income, expense, and journal entries with full audit logging and balance tracking.

## Base URL
```
http://127.0.0.1:4000/api/daybook
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. List All Entries
```
GET /api/daybook
```

**Query Parameters:**
- `q` (string) - Search term (searches description, receipt_number, party_name, party_mobile)
- `from` (date) - Start date filter (YYYY-MM-DD)
- `to` (date) - End date filter (YYYY-MM-DD)
- `type` (string) - Entry type filter: `income`, `expense`, or `journal`
- `page` (number) - Page number (default: 1)
- `pageSize` (number) - Items per page (default: 50, max: 200)

**Example:**
```bash
GET /api/daybook?q=donation&from=2026-04-01&to=2026-04-30&type=income&page=1&pageSize=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 45,
  "page": 1,
  "pageSize": 20
}
```

---

### 2. Get Single Entry
```
GET /api/daybook/:id
```

**Example:**
```bash
GET /api/daybook/123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "temple_id": 1,
    "entry_date": "2026-04-14",
    "entry_type": "income",
    "description": "Donation received",
    "amount": 5000.00,
    "payment_mode": "cash",
    "party_name": "John Doe",
    "party_mobile": "9876543210",
    "receipt_number": "2026-0001",
    "notes": "General donation",
    "running_balance": 15000.00,
    "created_by": 1,
    "created_at": "2026-04-14T10:30:00.000Z",
    "updated_at": "2026-04-14T10:30:00.000Z"
  }
}
```

---

### 3. Create Entry
```
POST /api/daybook
```

**Request Body:**
```json
{
  "entry_date": "2026-04-14",
  "entry_type": "income",
  "description": "Donation for temple renovation",
  "amount": 10000.00,
  "payment_mode": "upi",
  "party_name": "Jane Smith",
  "party_mobile": "9876543210",
  "reference_type": "donation",
  "reference_id": 456,
  "notes": "Specific purpose donation"
}
```

**Required Fields:**
- `entry_date` (date) - Transaction date in YYYY-MM-DD format
- `entry_type` (string) - One of: `income`, `expense`, `journal`
- `description` (string) - Description of the transaction
- `amount` (number) - Positive decimal amount

**Optional Fields:**
- `payment_mode` (string) - `cash`, `card`, `upi`, `cheque`, `bank_transfer` (default: `cash`)
- `party_name` (string) - Person/organization name
- `party_mobile` (string) - 10-digit mobile number
- `reference_type` (string) - Related module (e.g., `donation`, `annadhanam`, `pooja`)
- `reference_id` (number) - Related record ID
- `notes` (string) - Additional notes

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 124,
    "receipt_number": "2026-0002",
    ...
  }
}
```

---

### 4. Update Entry
```
PUT /api/daybook/:id
```

**Request Body:** (all fields optional)
```json
{
  "description": "Updated description",
  "amount": 12000.00,
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### 5. Delete Entry
```
DELETE /api/daybook/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Daybook entry deleted successfully"
}
```

---

### 6. Get Next Receipt Number
```
GET /api/daybook/next-receipt
```

**Response:**
```json
{
  "success": true,
  "receipt_number": "2026-0003"
}
```

---

### 7. Get Audit Logs
```
GET /api/daybook/logs
GET /api/daybook/:id/logs
```

**Query Parameters:**
- `page` (number) - Page number
- `pageSize` (number) - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "daybook_entry_id": 123,
      "action": "created",
      "created_at": "2026-04-14T10:30:00.000Z",
      "created_by": 1,
      "details": { ... }
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 50
}
```

---

### 8. Get Statistics
```
GET /api/daybook/stats/summary
```

**Query Parameters:**
- `from` (date) - Start date (YYYY-MM-DD)
- `to` (date) - End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_income": 50000.00,
    "total_expense": 20000.00,
    "total_entries": 25,
    "income_count": 15,
    "expense_count": 8,
    "journal_count": 2,
    "current_balance": 30000.00,
    "period": {
      "from": "2026-04-01",
      "to": "2026-04-30"
    }
  }
}
```

---

### 9. Export to CSV
```
GET /api/daybook/export
```

**Query Parameters:**
- `from` (date) - Start date
- `to` (date) - End date
- `type` (string) - Entry type filter

**Response:** CSV file download

---

## Running Tests

### Prerequisites
1. Server must be running on port 4000
2. Database must have daybook tables created
3. Valid user credentials with daybook permission

### Setup

1. **Run the migration:**
```bash
npm run migrate
```

2. **Start the server:**
```bash
npm run dev
```

3. **Update test credentials** in `daybook.test.js`:
```javascript
const TEST_USER = {
  mobile: '9999999999',    // Your mobile number
  password: 'test123',      // Your password
  templeId: 1,              // Your temple ID
  role: 'admin'             // Your role
};
```

### Run Tests

**Option 1: Using batch file (Windows)**
```bash
run-daybook-tests.bat
```

**Option 2: Using Node directly**
```bash
node daybook.test.js
```

### Test Coverage

The test suite includes:

✅ **Authentication Tests**
- Unauthorized access (no token)
- Invalid token handling

✅ **GET Endpoint Tests**
- List all entries
- Pagination
- Search functionality
- Date range filtering
- Entry type filtering
- Single entry retrieval
- Non-existent entry handling

✅ **POST Endpoint Tests**
- Create income entry
- Create expense entry
- Create journal entry
- Validation: missing required fields
- Validation: invalid entry type
- Validation: negative amount
- Validation: invalid date format
- Validation: invalid mobile number

✅ **PUT Endpoint Tests**
- Update entry
- Update non-existent entry

✅ **DELETE Endpoint Tests**
- Delete entry
- Delete non-existent entry

✅ **Audit Log Tests**
- Get all logs
- Get entry-specific logs

✅ **Statistics Tests**
- Get summary statistics
- Statistics with date range

✅ **Export Tests**
- CSV export functionality

✅ **Balance Calculation Tests**
- Running balance accuracy

---

## Entry Types

### Income
Represents money coming into the temple (donations, fees, etc.)
- **Impact:** Increases running balance

### Expense
Represents money going out (payments, purchases, etc.)
- **Impact:** Decreases running balance

### Journal
Represents accounting adjustments that don't affect cash balance
- **Impact:** No impact on running balance

---

## Payment Modes

- `cash` - Cash transactions
- `card` - Credit/Debit card
- `upi` - UPI payments
- `cheque` - Cheque payments
- `bank_transfer` - Bank transfers

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields: entry_date, entry_type, description, amount"
}
```

### 401 Unauthorized
```json
{
  "error": "Access denied. No JWT provided."
}
```

### 403 Forbidden
```json
{
  "error": "Access denied. Invalid JWT."
}
```

### 404 Not Found
```json
{
  "error": "Daybook entry not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Features

✨ **Auto-generated Receipt Numbers**
- Format: `YYYY-XXXX` (e.g., `2026-0001`)
- Auto-incrementing per year per temple

✨ **Running Balance**
- Automatically calculated on create/update
- Income increases, expense decreases, journal has no impact

✨ **Audit Logging**
- All create/update/delete actions logged
- Before/after snapshots stored

✨ **Temple Scoping**
- Data isolated by temple_id
- Users can only access their temple's data

✨ **Search & Filter**
- Full-text search on key fields
- Date range filtering
- Entry type filtering

✨ **CSV Export**
- Export filtered results to CSV
- Includes all entry details

---

## Database Schema

### daybook_entries
- `id` - Primary key
- `temple_id` - Foreign key to temples
- `entry_date` - Transaction date
- `entry_type` - income/expense/journal
- `description` - Transaction description
- `amount` - Transaction amount
- `payment_mode` - Payment method
- `party_name` - Associated person
- `party_mobile` - Contact number
- `receipt_number` - Auto-generated receipt
- `reference_type` - Related module
- `reference_id` - Related record ID
- `notes` - Additional notes
- `running_balance` - Calculated balance
- `created_by` - User who created
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### daybook_logs
- `id` - Primary key
- `temple_id` - Foreign key to temples
- `daybook_entry_id` - Related entry
- `action` - created/updated/deleted
- `details` - JSON snapshot
- `created_by` - User who performed action
- `created_at` - Log timestamp

---

## Permission

The daybook feature uses the `daybook` permission with `view` access level.

To grant access:
1. User must have `daybook` in their `user_permissions` table
2. Or user's role must have `daybook` in `role_permissions` table

---

## Support

For issues or questions, check:
- Server logs for detailed error messages
- Database for daybook_logs entries
- API response for validation errors

---

## Version History

**v1.0.0** (2026-04-14)
- Initial release
- Full CRUD operations
- Audit logging
- Balance tracking
- CSV export
- Statistics API
