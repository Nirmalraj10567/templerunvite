// Debug Hall booking journal mirroring
console.log('🔍 Debugging Hall booking journal mirroring...\n');

// Test the amount parsing logic that's used in hallBookings.js
function testAmountParsing() {
  console.log('💰 Testing amount parsing logic:');
  
  const testCases = [
    { advanceAmount: '250.00', totalAmount: '700.00', expected: 250 },
    { advanceAmount: '', totalAmount: '500.00', expected: 500 },
    { advanceAmount: '0', totalAmount: '300.00', expected: 300 },
    { advanceAmount: null, totalAmount: '400.00', expected: 400 },
    { advanceAmount: undefined, totalAmount: '600.00', expected: 600 },
    { advanceAmount: 'invalid', totalAmount: '200.00', expected: 200 },
    { advanceAmount: '', totalAmount: '', expected: 0 },
  ];
  
  testCases.forEach((test, i) => {
    const amountNum = Number(test.advanceAmount || test.totalAmount || 0);
    const isValid = !isNaN(amountNum) && amountNum > 0;
    const status = isValid ? '✅' : '❌';
    
    console.log(`  Test ${i + 1}: ${status} advance="${test.advanceAmount}" total="${test.totalAmount}" → ${amountNum} (valid: ${isValid})`);
    
    if (amountNum !== test.expected) {
      console.log(`    ⚠️ Expected ${test.expected}, got ${amountNum}`);
    }
  });
}

// Test the payload structure that would be sent from frontend
function testPayloadStructure() {
  console.log('\n📦 Testing payload structure:');
  
  const frontendPayload = {
    registerNo: '2025-TEST-001',
    date: '2025-09-21',
    time: '12:30',
    event: 'Test Event',
    name: 'Test User',
    mobile: '9999999999',
    advanceAmount: '100.00',
    totalAmount: '500.00',
    balanceAmount: '400.00',
    remarks: 'Test hall booking',
    transferTo: 'INCOME A/C',
    fromAccount: 'HALL ENTRY A/C',
    amount: '100.00'
  };
  
  console.log('Frontend payload:');
  console.log(JSON.stringify(frontendPayload, null, 2));
  
  // Simulate backend processing
  const p = frontendPayload;
  const amountNum = Number(p.advanceAmount || p.totalAmount || 0);
  const isValid = !isNaN(amountNum) && amountNum > 0;
  
  console.log(`\nBackend processing:`);
  console.log(`  Amount extracted: ${amountNum}`);
  console.log(`  Is valid: ${isValid}`);
  console.log(`  Would create journal entry: ${isValid ? 'YES' : 'NO'}`);
  
  if (isValid) {
    console.log(`  Journal entry would be:`);
    console.log(`    from_account: "HALL A/C"`);
    console.log(`    to_account: "INCOME A/C"`);
    console.log(`    amount: ${amountNum}`);
    console.log(`    reference_type: "hall_booking"`);
  }
}

// Test date handling
function testDateHandling() {
  console.log('\n📅 Testing date handling:');
  
  const testDates = [
    '2025-09-21',
    '',
    null,
    undefined,
    '2025-12-31'
  ];
  
  testDates.forEach((date, i) => {
    const entryDate = date || new Date().toISOString().slice(0,10);
    console.log(`  Test ${i + 1}: "${date}" → "${entryDate}"`);
  });
}

// Check if the issue might be with the database query
function testWhereClause() {
  console.log('\n🔍 Testing WHERE clause structure:');
  
  const mockRow = { id: 123, temple_id: 2, date: '2025-09-21' };
  const mockPayload = { advanceAmount: '100.00', remarks: 'Test' };
  
  const amountNum = Number(mockPayload.advanceAmount || 0);
  const fromAccount = 'HALL A/C';
  const toAccount = 'INCOME A/C';
  const entryDate = mockRow.date || new Date().toISOString().slice(0,10);
  
  const whereClause = {
    reference_type: 'hall_booking',
    from_account: fromAccount,
    to_account: toAccount,
    amount: amountNum,
    date: entryDate,
    reference_id: mockRow.id,
    temple_id: mockRow.temple_id
  };
  
  console.log('WHERE clause for duplicate check:');
  console.log(JSON.stringify(whereClause, null, 2));
  
  console.log('\nThis query would be:');
  console.log(`SELECT * FROM journal_entries WHERE`);
  Object.entries(whereClause).forEach(([key, value]) => {
    console.log(`  ${key} = '${value}' AND`);
  });
  console.log('(remove last AND)');
}

// Main execution
testAmountParsing();
testPayloadStructure();
testDateHandling();
testWhereClause();

console.log('\n🎯 Key things to check:');
console.log('1. Is the backend server actually running?');
console.log('2. Is the database connected and journal_entries table exists?');
console.log('3. Are you sending advanceAmount or totalAmount > 0?');
console.log('4. Check backend console logs for the ✅/❌ messages');
console.log('5. Verify the date range in your journal query includes the booking date');

console.log('\n🚀 To test manually:');
console.log('1. Start backend: cd server && node backend.js');
console.log('2. Check if it shows "Server running on port 4000"');
console.log('3. Create a hall booking with advance > 0');
console.log('4. Look for console messages like "✅ Journal entry created for hall booking"');
console.log('5. Query journal with the exact booking date');
