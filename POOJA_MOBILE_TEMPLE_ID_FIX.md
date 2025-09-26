# Pooja Mobile Temple ID Foreign Key Fix

## Problem
The pooja mobile submission API was failing with a foreign key constraint error:
```
Cannot add or update a child row: a foreign key constraint fails (`xesstech_templerun`.`pooja`, CONSTRAINT `pooja_ibfk_1` FOREIGN KEY (`temple_id`) REFERENCES `temples` (`id`) ON DELETE CASCADE)
```

## Root Cause
The `pooja-mobile.js` file was hardcoded to use `temple_id: 1`, but this temple ID didn't exist in the `temples` table, causing the foreign key constraint to fail.

## Solution
Updated the pooja mobile submission logic to properly resolve a valid temple ID, following the same pattern used in other mobile APIs:

### Before (Problematic):
```javascript
// Hardcoded temple_id
const conflictingBooking = await db('pooja')
  .where('temple_id', 1) // Default temple
  // ...

// Insert with hardcoded temple_id
const [poojaId] = await db('pooja').insert({
  temple_id: 1,
  // ...
});
```

### After (Fixed):
```javascript
// Resolve a valid temple id
let templeId = Number(req.body?.temple_id) || null;
try {
  if (templeId) {
    const t = await db('temples').where({ id: templeId }).first();
    if (!t) templeId = null;
  }
  if (!templeId) {
    // fallback: pick the first available temple id, else 1
    let row = null;
    try { row = await db('temples').min({ id: 'id' }).first(); } catch {}
    templeId = Number(row?.id) || 1;
  }
} catch (e) {
  // If temples table not accessible, fallback to 1
  templeId = 1;
}

// Use resolved templeId
const conflictingBooking = await db('pooja')
  .where('temple_id', templeId)
  // ...

const [poojaId] = await db('pooja').insert({
  temple_id: templeId,
  // ...
});
```

## Benefits
1. **Dynamic temple resolution**: Uses actual temple IDs from the database
2. **Fallback logic**: Gracefully handles missing temples
3. **Consistent pattern**: Matches other mobile APIs (hall-mobile.js, annadhanam-mobile.js)
4. **Error prevention**: Avoids foreign key constraint failures

## Files Modified
- `server/pooja-mobile.js` - Added proper temple ID resolution logic

## Additional Tools
- `ensure-temple-exists.js` - Script to verify temples exist in database

## Testing
1. Ensure at least one temple exists in the `temples` table
2. Test pooja mobile submission API
3. Verify no foreign key constraint errors occur

## Related
- Similar fixes were already implemented in `hall-mobile.js` and `annadhanam-mobile.js`
- This fix brings `pooja-mobile.js` in line with the established pattern
