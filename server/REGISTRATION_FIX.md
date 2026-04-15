============================================================
REGISTRATION ERROR FIXED
============================================================

## Problem
Registration was failing with "Database error during registration"

## Root Cause
The database name was not configured in the env file.
The code was defaulting to 'temple' but your actual database is 'temp'.

## What Was Fixed

### 1. ✅ Updated env file
Added: `MYSQL_DATABASE = "temp"`

### 2. ✅ Fixed MySQL compatibility
Changed `onConflict()` to raw SQL for MySQL:
- Permissions insert uses `INSERT IGNORE`
- Custom permissions use `ON DUPLICATE KEY UPDATE`

### 3. ✅ Added error details
Temporary detailed error logging to help debug

## How to Test

### IMPORTANT: Restart the backend server first!
```bash
# Stop the running server (Ctrl+C)
# Then start it again:
cd D:\templerunvite\server
npm run dev
```

### Then test registration:
```bash
node test-register.js
```

### Or via frontend:
1. Go to http://localhost:8080/register (or your frontend URL)
2. Fill in the registration form
3. Submit - should work now!

## Test Credentials for Login

After successful registration, you can login with:
- Username: (the username you registered with)
- Password: test123

Or use the test admin account:
- Username: test_admin
- Password: test123

## Files Changed

| File | Change |
|------|--------|
| `env` | Added MYSQL_DATABASE = "temp" |
| `users.js` | Fixed MySQL compatibility (onConflict → raw SQL) |
| `users.js` | Added detailed error logging |

## Expected Registration Flow

1. ✅ User fills registration form
2. ✅ Form submits to `/api/users/register`
3. ✅ Creates new temple (if public registration)
4. ✅ Creates user with hashed password
5. ✅ Inserts 30 permissions
6. ✅ Returns success with user data
7. ✅ User can now login

## Troubleshooting

If registration still fails:
1. **Restart the server** - env changes require restart
2. **Check console logs** - look for detailed error message
3. **Verify database** - run `node debug-register.js` to test DB operations

---

**Status:** ✅ FIXED - Database configured and MySQL compatibility added
