# Pooja Approval System API Documentation

## Overview
The Pooja Approval System provides a complete workflow for mobile users to submit pooja requests and for administrators to approve or reject them. The system includes mobile-friendly endpoints and an admin approval panel.

## Database Schema

### Pooja Table (Updated)
```sql
-- Additional columns added for approval system
ALTER TABLE pooja ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
ALTER TABLE pooja ADD COLUMN submitted_by_mobile TEXT;
ALTER TABLE pooja ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pooja ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE pooja ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE pooja ADD COLUMN rejection_reason TEXT;
ALTER TABLE pooja ADD COLUMN admin_notes TEXT;
```

### Pooja Approval Logs Table
```sql
CREATE TABLE pooja_approval_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pooja_id INTEGER NOT NULL REFERENCES pooja(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'cancelled', 'modified')),
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  old_status TEXT,
  new_status TEXT
);
```

## Mobile API Endpoints

### Base URL
```
http://localhost:4000/api/pooja-mobile
```

### 1. Submit Pooja Request
**POST** `/submit`

Submit a new pooja request from mobile app.

**Request Body:**
```json
{
  "receipt_number": "POO123456789",
  "name": "John Doe",
  "mobile_number": "9876543210",
  "time": "18:00",
  "from_date": "2024-12-15",
  "to_date": "2024-12-15",
  "remarks": "Special prayer request",
  "submitted_by_mobile": "9876543210"
}
```

**Response:**
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

**Error Responses:**
- `400` - Missing required fields
- `400` - Receipt number already exists
- `400` - Time slot already booked
- `500` - Internal server error

### 2. Get User's Requests
**GET** `/my-requests?mobile_number=9876543210`

Get all requests submitted by a specific mobile number.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "receipt_number": "POO123456789",
      "name": "John Doe",
      "mobile_number": "9876543210",
      "time": "18:00",
      "from_date": "2024-12-15",
      "to_date": "2024-12-15",
      "remarks": "Special prayer request",
      "status": "pending",
      "submitted_at": "2024-12-01T10:30:00Z",
      "approved_at": null,
      "rejection_reason": null,
      "admin_notes": null
    }
  ]
}
```

### 3. Get Request Details
**GET** `/request/123?mobile_number=9876543210`

Get detailed information about a specific request including approval logs.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "receipt_number": "POO123456789",
    "name": "John Doe",
    "mobile_number": "9876543210",
    "time": "18:00",
    "from_date": "2024-12-15",
    "to_date": "2024-12-15",
    "remarks": "Special prayer request",
    "status": "approved",
    "submitted_at": "2024-12-01T10:30:00Z",
    "approved_at": "2024-12-01T14:20:00Z",
    "rejection_reason": null,
    "admin_notes": "Approved for special occasion",
    "logs": [
      {
        "id": 1,
        "action": "submitted",
        "performed_by": null,
        "performed_at": "2024-12-01T10:30:00Z",
        "notes": "Submitted from mobile by 9876543210",
        "old_status": null,
        "new_status": "pending"
      },
      {
        "id": 2,
        "action": "approved",
        "performed_by": 1,
        "performed_at": "2024-12-01T14:20:00Z",
        "notes": "Approved for special occasion",
        "old_status": "pending",
        "new_status": "approved"
      }
    ]
  }
}
```

### 4. Cancel Request
**PUT** `/cancel/123`

Cancel a pending request.

**Request Body:**
```json
{
  "mobile_number": "9876543210",
  "reason": "Change of plans"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request cancelled successfully"
}
```

### 5. Get Available Time Slots
**GET** `/available-slots?from_date=2024-12-15&to_date=2024-12-15`

Get available time slots for a date range.

**Response:**
```json
{
  "success": true,
  "data": {
    "available_slots": [
      "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
      "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
      "21:30", "22:00"
    ],
    "booked_slots": ["18:00"],
    "total_available": 32,
    "total_booked": 1
  }
}
```

## Admin Approval API Endpoints

### Base URL
```
http://localhost:4000/api/pooja-approval
```

**Authentication Required:** Bearer Token
**Permissions Required:** `pooja_approval` permission

### 1. Get Pending Requests
**GET** `/pending?page=1&pageSize=10&search=john`

Get all pending requests for approval with pagination and search.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "receipt_number": "POO123456789",
      "name": "John Doe",
      "mobile_number": "9876543210",
      "time": "18:00",
      "from_date": "2024-12-15",
      "to_date": "2024-12-15",
      "remarks": "Special prayer request",
      "submitted_by_mobile": "9876543210",
      "submitted_at": "2024-12-01T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 2. Get Request Details
**GET** `/request/123`

Get detailed information about a specific request for approval.

**Response:** Same as mobile API request details endpoint.

### 3. Approve Request
**PUT** `/approve/123`

Approve a pending request.

**Request Body:**
```json
{
  "admin_notes": "Approved for special occasion"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request approved successfully"
}
```

**Error Responses:**
- `404` - Request not found or already processed
- `400` - Time slot conflicts with existing approved booking
- `500` - Internal server error

### 4. Reject Request
**PUT** `/reject/123`

Reject a pending request.

**Request Body:**
```json
{
  "rejection_reason": "Time slot not available",
  "admin_notes": "Please choose a different time"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request rejected successfully"
}
```

### 5. Get Approval Statistics
**GET** `/stats`

Get approval statistics and recent activity.

**Response:**
```json
{
  "success": true,
  "data": {
    "status_counts": {
      "pending": 5,
      "approved": 25,
      "rejected": 3,
      "cancelled": 2
    },
    "recent_activity": [
      {
        "action": "approved",
        "count": 8
      },
      {
        "action": "submitted",
        "count": 12
      },
      {
        "action": "rejected",
        "count": 2
      }
    ],
    "total_requests": 35
  }
}
```

### 6. Bulk Actions
**PUT** `/bulk-action`

Perform bulk approve or reject actions on multiple requests.

**Request Body:**
```json
{
  "action": "approve",
  "request_ids": [123, 124, 125],
  "reason": "Bulk approval for festival period",
  "admin_notes": "All requests approved for special festival"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk approve completed",
  "data": {
    "approved": 3,
    "rejected": 0,
    "errors": []
  }
}
```

## Frontend Routes

### Admin Routes (Protected)
- `/dashboard/pooja/approval` - Pooja approval panel (requires `pooja_approval` permission)

### Public Mobile Routes
- `/pooja/request` - Submit new pooja request
- `/pooja/my-requests` - View user's submitted requests

## Permissions

### Database Permissions
```sql
-- Add permissions
INSERT INTO permissions (id, name, description) VALUES 
('pooja_approval', 'Pooja Approval', 'Approve or reject pooja requests from mobile users'),
('pooja_mobile_submit', 'Pooja Mobile Submit', 'Submit pooja requests from mobile app');

-- Grant to roles
INSERT INTO role_permissions (role_id, permission_id, access_level) VALUES
('admin', 'pooja_approval', 'full'),
('superadmin', 'pooja_approval', 'full'),
('member', 'pooja_mobile_submit', 'full');
```

### User-Specific Permissions
```sql
-- Grant specific permission to user with mobile 9999999999
INSERT INTO user_permissions (user_id, permission_id, access_level)
SELECT u.id, 'pooja_mobile_submit', 'full'
FROM users u
WHERE u.mobile = '9999999999';
```

## Status Flow

```
[Submitted] → [Pending] → [Approved/Rejected]
     ↓           ↓
[Cancelled] ← [Cancelled]
```

### Status Descriptions
- **pending**: Request submitted and awaiting approval
- **approved**: Request approved by admin
- **rejected**: Request rejected by admin
- **cancelled**: Request cancelled by user or admin

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Validation Errors
- Mobile number must be 10 digits starting with 6-9
- Time must be in HH:MM format
- Dates must be in YYYY-MM-DD format
- From date must be before or equal to to date
- Future dates only for new requests

## Testing

### Test Mobile Submission
```bash
curl -X POST http://localhost:4000/api/pooja-mobile/submit \
  -H "Content-Type: application/json" \
  -d '{
    "receipt_number": "TEST001",
    "name": "Test User",
    "mobile_number": "9999999999",
    "time": "18:00",
    "from_date": "2024-12-15",
    "to_date": "2024-12-15",
    "remarks": "Test request"
  }'
```

### Test Admin Approval
```bash
curl -X PUT http://localhost:4000/api/pooja-approval/approve/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "admin_notes": "Test approval"
  }'
```

## Features

### Mobile Features
- ✅ Submit pooja requests without authentication
- ✅ View submitted requests by mobile number
- ✅ Cancel pending requests
- ✅ Check available time slots
- ✅ Real-time validation
- ✅ Mobile-friendly UI

### Admin Features
- ✅ View all pending requests
- ✅ Approve/reject individual requests
- ✅ Bulk approve/reject operations
- ✅ Add admin notes and rejection reasons
- ✅ View approval statistics
- ✅ Track approval history
- ✅ Search and filter requests

### System Features
- ✅ Double-booking prevention
- ✅ Automatic receipt number generation
- ✅ Approval workflow logging
- ✅ Status tracking
- ✅ Email/SMS notifications (ready for integration)
- ✅ Mobile-responsive design
- ✅ Bilingual support (English/Tamil)
