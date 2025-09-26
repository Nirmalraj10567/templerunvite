# Money Donation Journal Entry Update Fix

## Problem
When a money donation was edited in the system, the corresponding journal entry was not being updated. This caused inconsistencies between the donation records and the accounting journal entries.

## Root Cause
- When creating a money donation, the backend automatically creates a journal entry (lines 1095-1115 in `server/backend.js`)
- However, the PUT endpoint for updating money donations (line 1135) only updated the donation record but ignored the associated journal entry
- Similarly, the DELETE endpoint didn't clean up the associated journal entry

## Solution
Updated the money donation endpoints in `server/backend.js` to maintain journal entry consistency:

### 1. Update Endpoint Enhancement
**File:** `server/backend.js` (PUT `/api/money-donations/:id`)

**Changes:**
- Added journal entry update logic after successful donation update
- If a journal entry exists for the donation, it updates:
  - `date` - matches the donation date
  - `amount` - matches the donation amount  
  - `remarks` - matches the donation reason
  - `to_account` - matches the donation transfer_to_account
- If no journal entry exists (backward compatibility), creates a new one
- Includes proper error handling that doesn't fail the main request

### 2. Delete Endpoint Enhancement  
**File:** `server/backend.js` (DELETE `/api/money-donations/:id`)

**Changes:**
- Added journal entry deletion before deleting the donation
- Finds and removes journal entries with `reference_type='money_donation'` and matching `reference_id`
- Includes proper error handling that doesn't fail the main request

## Technical Details

### Journal Entry Fields Updated
```javascript
const journalUpdate = {
  date: row.date,                    // From donation.date
  amount: row.amount,                // From donation.amount  
  remarks: row.reason || null,       // From donation.reason
  to_account: row.transfer_to_account || 'INCOME A/C', // From donation.transfer_to_account
  updated_at: db.fn.now(),
};
```

### Error Handling
- Journal operations are wrapped in try-catch blocks
- Failures in journal operations are logged but don't fail the main donation operation
- This ensures the system remains functional even if journal table issues occur

## Testing
A test script `test-money-donation-journal-update.js` has been created to verify:
1. Money donation creation creates journal entry
2. Money donation update updates journal entry
3. Money donation deletion removes journal entry

## Files Modified
1. `server/backend.js` - Enhanced PUT and DELETE endpoints for money donations
2. `test-money-donation-journal-update.js` - Test script (new file)
3. `MONEY_DONATION_JOURNAL_UPDATE_FIX.md` - This documentation (new file)

## Frontend Impact
No frontend changes required. The existing frontend code in:
- `src/pages/donations/MoneyDonationEntry.tsx` 
- `src/pages/donations/MoneyDonationList.tsx`
- `src/services/moneyDonationService.ts`

Will continue to work as before, but now journal entries will be properly maintained.

## Backward Compatibility
- Existing donations without journal entries will have them created when updated
- No database migrations required
- No breaking changes to API contracts

## Benefits
1. **Data Consistency** - Journal entries now stay in sync with donation records
2. **Accurate Accounting** - Financial reports will reflect actual donation data
3. **Audit Trail** - Complete transaction history maintained
4. **No Data Loss** - Proper cleanup when donations are deleted

## Verification Steps
1. Create a money donation - verify journal entry is created
2. Edit the money donation (amount, date, reason, transfer account) - verify journal entry is updated
3. Delete the money donation - verify journal entry is removed
4. Check that existing donations can be updated without issues