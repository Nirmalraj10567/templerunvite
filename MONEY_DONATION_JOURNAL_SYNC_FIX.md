# Money Donation Journal Sync Fix

## Problem
Money donation updates were not properly reflecting in journal logs, unlike hall booking updates which worked correctly.

## Root Cause
The money donation update logic was using an "update in place" approach for journal entries, while hall bookings used a "delete and recreate" approach. The update approach had issues with:
- Corrupted or missing journal entries
- Inconsistent data synchronization
- Not handling edge cases properly

## Solution
Updated the money donation journal sync logic in `server/backend.js` to match the hall booking pattern:

### Before (Problematic):
```javascript
// Update the journal entry with new values
const journalUpdate = {
  date: row.date,
  amount: row.amount,
  remarks: row.reason || null,
  to_account: row.transfer_to_account || 'INCOME A/C',
  updated_at: db.fn.now(),
};

await db('journal_entries')
  .where({ 
    reference_type: 'money_donation', 
    reference_id: Number(id),
    temple_id: templeId 
  })
  .update(journalUpdate);
```

### After (Fixed):
```javascript
// First, delete existing journal entries for this donation
await db('journal_entries')
  .where({ 
    reference_type: 'money_donation', 
    reference_id: Number(id),
    temple_id: templeId 
  })
  .del();

// Create new journal entry with updated data
const amountNum = Number(row.amount || 0);
if (amountNum > 0) {
  const entryData = {
    date: row.date || new Date().toISOString().slice(0, 10),
    from_account: 'DONATION A/C',
    to_account: row.transfer_to_account || 'INCOME A/C',
    amount: amountNum,
    entry_type: 'transfer',
    remarks: row.reason || `Updated money donation - ${row.name || 'Unknown'}`,
    reference_type: 'money_donation',
    reference_id: Number(id),
    temple_id: templeId,
    created_by: req.user.id,
    created_at: db.fn.now()
  };

  await db('journal_entries').insert(entryData);
}
```

## Benefits
1. **Consistent behavior**: Now matches hall booking update pattern
2. **Reliable sync**: Delete and recreate ensures clean journal entries
3. **Better error handling**: Handles missing or corrupted journal entries
4. **Improved logging**: Added debug logs for troubleshooting

## Files Modified
- `server/backend.js` - Updated money donation PUT endpoint journal sync logic

## Testing
Use the provided test script `test-money-donation-journal-sync.js` to verify the fix works correctly.

## Related
- Hall booking updates already worked correctly using the delete-and-recreate pattern
- This fix ensures money donation updates now work the same way
