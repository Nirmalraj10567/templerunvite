# Pooja Mobile API - cURL Examples

## Base URL
```
http://localhost:4000-mobile
```

## Authentication
The API requires a mobile token in the Authorization header. You can use either:
- JWT token: `Bearer <jwt_token>`
- Mobile token: `Bearer mobile_<user_id>`

## 1. Submit Pooja Request

### Basic Example
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_123" \
  -d '{
    "receipt_number": "2025-0001",
    "name": "John Doe",
    "mobile_number": "9876543210",
    "time": "10:00",
    "from_date": "2025-09-28",
    "to_date": "2025-09-28",
    "remarks": "Special pooja request",
    "submitted_by_mobile": "9876543210"
  }'
```

### With Temple ID
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_123" \
  -d '{
    "receipt_number": "2025-0002",
    "name": "Jane Smith",
    "mobile_number": "9876543211",
    "time": "14:00",
    "from_date": "2025-09-29",
    "to_date": "2025-09-29",
    "remarks": "Wedding ceremony pooja",
    "submitted_by_mobile": "9876543211",
    "temple_id": 1
  }'
```

### Using JWT Token
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "receipt_number": "2025-0003",
    "name": "Robert Johnson",
    "mobile_number": "9876543212",
    "time": "09:00",
    "from_date": "2025-09-30",
    "to_date": "2025-09-30",
    "remarks": "Birthday celebration"
  }'
```

## 2. Get User's Submitted Requests

### Get All User's Requests
```bash
curl -X GET http://localhost:4000-mobile/requests \
  -H "Authorization: Bearer mobile_123"
```

### Get Requests with Status Filter
```bash
curl -X GET "http://localhost:4000-mobile/requests?status=pending" \
  -H "Authorization: Bearer mobile_123"
```

### Get Requests with Date Range
```bash
curl -X GET "http://localhost:4000-mobile/requests?from=2025-09-01&to=2025-09-30" \
  -H "Authorization: Bearer mobile_123"
```

## 3. Get Available Time Slots

### Get Available Slots for a Date
```bash
curl -X GET "http://localhost:4000-mobile/available-slots?date=2025-09-28" \
  -H "Authorization: Bearer mobile_123"
```

### Get Available Slots with Temple ID
```bash
curl -X GET "http://localhost:4000-mobile/available-slots?date=2025-09-28&temple_id=1" \
  -H "Authorization: Bearer mobile_123"
```

## 4. Error Handling Examples

### Missing Required Fields
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_123" \
  -d '{
    "receipt_number": "2025-0004",
    "name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

### Duplicate Receipt Number
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_123" \
  -d '{
    "receipt_number": "2025-0001",
    "name": "Another User",
    "mobile_number": "9876543213",
    "time": "11:00",
    "from_date": "2025-09-28",
    "to_date": "2025-09-28"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Receipt number already exists"
}
```

### Time Slot Already Booked
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_123" \
  -d '{
    "receipt_number": "2025-0005",
    "name": "Conflicting User",
    "mobile_number": "9876543214",
    "time": "10:00",
    "from_date": "2025-09-28",
    "to_date": "2025-09-28"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Time slot already booked. Please choose a different time or date."
}
```

## 5. Success Response Example

### Successful Submission
```json
{
  "success": true,
  "message": "Pooja request submitted successfully. Awaiting approval.",
  "data": {
    "id": 123,
    "status": "pending"
  }
}
```

## 6. Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receipt_number` | string | Yes | Unique receipt number for the pooja |
| `name` | string | Yes | Name of the person requesting pooja |
| `mobile_number` | string | Yes | Mobile number (10 digits) |
| `time` | string | Yes | Time in HH:MM format (24-hour) |
| `from_date` | string | Yes | Start date in YYYY-MM-DD format |
| `to_date` | string | Yes | End date in YYYY-MM-DD format |
| `remarks` | string | No | Additional notes or special requests |
| `submitted_by_mobile` | string | No | Mobile number of the person submitting |
| `temple_id` | number | No | Specific temple ID (auto-resolved if not provided) |

## 7. Testing with Different Scenarios

### Multi-day Pooja
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_123" \
  -d '{
    "receipt_number": "2025-0006",
    "name": "Festival Pooja",
    "mobile_number": "9876543215",
    "time": "09:00",
    "from_date": "2025-09-28",
    "to_date": "2025-09-30",
    "remarks": "3-day festival celebration"
  }'
```

### Early Morning Pooja
```bash
curl -X POST http://localhost:4000-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mobile_123" \
  -d '{
    "receipt_number": "2025-0007",
    "name": "Sunrise Pooja",
    "mobile_number": "9876543216",
    "time": "06:00",
    "from_date": "2025-09-28",
    "to_date": "2025-09-28",
    "remarks": "Early morning special pooja"
  }'
```

## 8. Environment Variables for Testing

You can set these environment variables for easier testing:

```bash
export API_BASE_URL="http://localhost:4000
export MOBILE_TOKEN="mobile_123"
export JWT_TOKEN="your_jwt_token_here"
```

Then use them in your curl commands:
```bash
curl -X POST $API_BASE_URL/api/pooja-mobile/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MOBILE_TOKEN" \
  -d '{
    "receipt_number": "2025-0008",
    "name": "Test User",
    "mobile_number": "9876543217",
    "time": "12:00",
    "from_date": "2025-09-28",
    "to_date": "2025-09-28"
  }'
```
