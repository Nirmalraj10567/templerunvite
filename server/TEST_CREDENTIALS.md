# 🔐 Test User Login Credentials

## ✅ Company: Test Company (Temple ID: 1)

### Login Credentials

| Field | Value |
|-------|-------|
| **Username** | `test_admin` |
| **Password** | `test123` |
| **Mobile** | `9999999999` |
| **Email** | `test@example.com` |
| **Role** | `admin` |
| **Temple ID** | `1` |

---

## 🚀 How to Login

### Option 1: Via Login API
```bash
curl -X POST https://templeapi.agniplay.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test_admin","password":"test123"}'
```

### Option 2: Via Mobile Auth API
```bash
curl -X POST https://templeapi.agniplay.com/api/mobile-auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","password":"test123"}'
```

### Option 3: Direct JWT Token
If you need a token directly for testing:
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  {
    id: 1,
    mobile: '9999999999',
    username: 'test_admin',
    templeId: 1,
    role: 'admin'
  },
  'dev-insecure-secret-change-me',  // JWT_SECRET from env file
  { expiresIn: '24h' }
);
```

---

## ✅ Permissions Granted

This user has **FULL ACCESS** to:

- ✅ **daybook** - Daybook entries and logs
- ✅ dashboard - Dashboard access
- ✅ member_entry - Member entry
- ✅ master_data - Master data management
- ✅ balance_sheet - Balance sheet
- ✅ ledger_management - Ledger management
- ✅ transaction - Transactions
- ✅ report/reports - Reports
- ✅ setting/pdf_settings - Settings
- ✅ property_registrations - Property registrations
- ✅ view_donations/edit_donations - Donations
- ✅ receipts - Receipts
- ✅ donation_approval - Donation approval
- ✅ session_logs/view_session_logs - Session logs
- ✅ activity_logs - Activity logs
- ✅ tax_registrations - Tax registrations
- ✅ marriage_register - Marriage register
- ✅ user_registrations - User registrations
- ✅ pooja_registrations/pooja_approval - Pooja management
- ✅ hall_booking/hall_approval - Hall bookings
- ✅ view_events/edit_events - Events management
- ✅ annadhanam_registrations/annadhanam_approval - Annadhanam

---

## 📝 Testing Daybook

### Quick Test
```bash
# 1. Start server
npm run dev

# 2. Run daybook tests
node daybook.test.js

# OR
run-daybook-tests.bat
```

### Manual Test with Postman/cURL

**Get all daybook entries:**
```bash
curl -X GET https://templeapi.agniplay.com/api/daybook \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Create a daybook entry:**
```bash
curl -X POST https://templeapi.agniplay.com/api/daybook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "entry_date": "2026-04-14",
    "entry_type": "income",
    "description": "Test donation",
    "amount": 5000,
    "payment_mode": "cash",
    "party_name": "Test Donor",
    "party_mobile": "9876543210"
  }'
```

---

## 🔑 JWT Token Information

**Token Secret:** `dev-insecure-secret-change-me` (from `env` file)

**Token Payload:**
```json
{
  "id": 1,
  "mobile": "9999999999",
  "username": "test_admin",
  "templeId": 1,
  "role": "admin",
  "iat": <timestamp>,
  "exp": <timestamp>
}
```

**Token Expiry:** 24 hours from creation

---

## 📊 Database Information

**Database:** MySQL  
**Host:** 127.0.0.1:3306  
**Database Name:** temp  
**Username:** root  
**Password:** rootroot  

---

## ⚠️ Important Notes

1. **Change password in production** - This is a test account with a weak password
2. **JWT_SECRET** - Change the secret in `env` file for production
3. **Temple ID** - This user is scoped to temple_id 1
4. **Admin Role** - Has full admin access to all features

---

## 🛠️ Recreate Test User

If you need to recreate the user:

```bash
# Delete existing user (if needed)
mysql -u root -prootroot temp -e "DELETE FROM users WHERE username='test_admin';"

# Run creation script
node create-test-user-mysql.js

# Add permissions
node add-daybook-permission.js
```

---

**Created:** 2026-04-14  
**Status:** ✅ Ready for Testing
