# Mobile Authentication API Documentation

## Overview
This comprehensive mobile authentication system allows users to:
- Login using mobile number
- Support multiple users with the same mobile number
- Verify identity through OTP
- Retrieve detailed payment information

## Base URL
```
http://localhost:4000/api/mobile-auth
```

## Authentication Flow
1. Send OTP
2. Verify OTP
3. Use returned token for subsequent requests

## Endpoints

### 1. Send OTP
**POST** `/send-otp`

Sends OTP to user's mobile number for authentication.

#### Request Body Options
```json
// Option 1: Mobile Number Only
{
  "mobileNumber": "9999999999"
}

// Option 2: Mobile Number + Name
{
  "mobileNumber": "9999999999",
  "name": "John"
}

// Option 3: Mobile Number + Name + Receipt Number
{
  "mobileNumber": "9999999999",
  "name": "John",
  "receiptNumber": "6672"
}
```

#### Successful Response
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456", // DEVELOPMENT ONLY
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "referenceNumber": "6672",
      "mobileNumber": "9999999999",
      "fatherName": "Robert Doe",
      "alternativeName": "Johnny"
    },
    {
      "id": 2,
      "name": "Jane Doe",
      "referenceNumber": "6673",
      "mobileNumber": "9999999999",
      "fatherName": "Michael Doe",
      "alternativeName": "Jenny"
    }
  ]
}
```

#### Error Responses
- **400**: Missing or invalid mobile number
- **404**: No users found with the provided details

### 2. Verify OTP
**POST** `/verify-otp`

Verifies OTP and logs in the user.

#### Request Body
```json
{
  "mobileNumber": "9999999999",
  "name": "John Doe", // Optional
  "receiptNumber": "6672", // Optional
  "otp": "123456",
  "userId": 1 // Selected from Send OTP response
}
```

#### Successful Response
```json
{
  "success": true,
  "message": "Login successful",
  "token": "mobile_1_1703123456789",
  "user": {
    "id": 1,
    "name": "John Doe",
    "referenceNumber": "6672",
    "mobileNumber": "9999999999"
  }
}
```

#### Error Responses
- **400**: Invalid OTP or missing parameters
- **404**: User not found

### 3. Get Payment Details
**GET** `/payment-details/:userId`

Gets comprehensive payment information for the user.

#### Headers
```
Authorization: Bearer mobile_1_1703123456789
```

#### Successful Response
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "referenceNumber": "6672",
    "mobileNumber": "9999999999"
  },
  "paymentSummary": [
    {
      "year": 2024,
      "tax": {
        "totalAmount": 1000,
        "paidAmount": 500,
        "pendingAmount": 500,
        "status": "partial"
      },
      "pooja": {
        "totalAmount": 200,
        "paidAmount": 100,
        "pendingAmount": 100,
        "bookings": 2,
        "approvedBookings": 1
      },
      "total": {
        "totalAmount": 1200,
        "paidAmount": 600,
        "pendingAmount": 600
      }
    },
    {
      "year": 2023,
      "tax": {
        "totalAmount": 1000,
        "paidAmount": 0,
        "pendingAmount": 1000,
        "status": "pending"
      },
      "pooja": {
        "totalAmount": 0,
        "paidAmount": 0,
        "pendingAmount": 0,
        "bookings": 0,
        "approvedBookings": 0
      },
      "total": {
        "totalAmount": 1000,
        "paidAmount": 0,
        "pendingAmount": 1000
      }
    }
  ],
  "paymentHistory": [
    {
      "type": "tax",
      "year": 2024,
      "amount": 1000,
      "paidAmount": 500,
      "status": "partial",
      "date": "2024-01-15T00:00:00.000Z",
      "description": "Tax Payment - Year 2024"
    },
    {
      "type": "pooja",
      "year": 2024,
      "amount": 200,
      "paidAmount": 100,
      "status": "partial",
      "date": "2024-02-01T00:00:00.000Z",
      "description": "Pooja Booking - P001"
    }
  ],
  "currentYear": 2024,
  "totalOutstanding": 1100
}
```

#### Error Responses
- **401**: Invalid or missing token
- **403**: Unauthorized access to payment details
- **404**: User not found

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Unauthorized access |
| 404 | Not Found - User or resource not found |
| 500 | Internal Server Error |

## Usage Examples

### Complete Login Flow

1. **Send OTP**
```bash
curl -X POST http://localhost:4000/api/mobile-auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9999999999",
    "name": "John"
  }'
```

2. **Verify OTP**
```bash
curl -X POST http://localhost:4000/api/mobile-auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9999999999",
    "name": "John Doe",
    "otp": "123456",
    "userId": 1
  }'
```

3. **Get Payment Details**
```bash
curl -X GET http://localhost:4000/api/mobile-auth/payment-details/1 \
  -H "Authorization: Bearer mobile_1_1703123456789"
```

## Notes

- **Test OTP**: For development, use `123456` as the OTP
- **Mobile Number Format**: Should be 10 digits without any formatting
- **Multiple Users**: If multiple users have the same mobile number, all matching users are returned in the OTP response
- **User Selection**: User must select their specific user ID during OTP verification

## Security Considerations

- In production, implement proper OTP generation and SMS sending
- Use JWT tokens instead of simple session tokens
- Implement rate limiting for OTP requests
- Add proper input validation and sanitization
- Use HTTPS in production
- Implement proper session management with Redis or database storage
- Add additional authentication factors
- Log and monitor authentication attempts
- Implement account lockout after multiple failed attempts

## Potential Future Enhancements

1. Multi-factor authentication
2. Biometric login support
3. Device registration and management
4. Advanced session management
5. Comprehensive audit logging
6. Support for multiple languages in OTP and error messages
7. Implement email-based OTP as alternative
8. Add support for international mobile numbers
9. Implement progressive authentication
10. Create admin dashboard for user management

## Troubleshooting

- **No Users Found**: Ensure mobile number is correct and user exists in the system
- **OTP Verification Fails**: 
  - Check mobile number format
  - Verify correct user ID selected
  - Ensure OTP hasn't expired
- **Payment Details Not Accessible**: 
  - Verify authentication token
  - Check user permissions
  - Confirm user ID is correct

## Performance Considerations

- OTP generation and verification should be lightweight
- Implement caching for user lookup
- Use efficient database queries
- Minimize sensitive data in API responses
- Implement proper indexing on user lookup fields
