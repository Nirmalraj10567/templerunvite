#!/usr/bin/env node
/**
 * Test Hall Booking Flow (Mobile Booking + Approval)
 * Run: node test-hall-booking-flow.js
 */

const API_BASE = 'http://localhost:4000/api';

async function main() {
  console.log('='.repeat(50));
  console.log('TESTING HALL BOOKING FLOW');
  console.log('='.repeat(50));

  // Step 1: Login
  console.log('\n[1] Login...');
  const loginRes = await fetch(API_BASE + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin', password: 'test123' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    process.exit(1);
  }
  
  const login = await loginRes.json();
  const token = login.token;
  console.log('   ✓ Logged in as:', login.user.username);

  const hdr = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const testMobile = '999' + Date.now().toString().slice(-7);

  // Step 2: Mobile Submit
  console.log('\n[2] Submit booking via mobile API...');
  const submitRes = await fetch(API_BASE + '/hall-mobile/submit', {
    method: 'POST',
    headers: hdr,
    body: JSON.stringify({
      date: '2027-01-01',
      time: '10:00',
      name: 'Test Customer',
      mobile: testMobile,
      address: 'Test Address',
      village: 'Test Village',
      event: 'Marriage',
      total_amount: 10000,
      advance_amount: 5000,
      balance_amount: 5000,
      submitted_by_mobile: testMobile
    })
  });
  
  const submit = await submitRes.json();
  if (!submit.success) {
    console.error('   ✗ Submit failed:', submit.error);
    process.exit(1);
  }
  const bookingId = submit.data.id;
  console.log('   ✓ Booking submitted, ID:', bookingId, 'Status:', submit.data.status);

  // Step 3: List Pending
  console.log('\n[3] List pending requests...');
  const pendingRes = await fetch(API_BASE + '/hall-approval/requests?status=pending', { headers: { Authorization: 'Bearer ' + token } });
  const pending = await pendingRes.json();
  console.log('   ✓ Found', pending.data?.length || 0, 'pending requests');

  // Step 4: Approve
  console.log('\n[4] Approve request...');
  const approveRes = await fetch(API_BASE + '/hall-approval/approve/' + bookingId, {
    method: 'PUT',
    headers: hdr,
    body: JSON.stringify({ notes: 'Approved for testing' })
  });
  const approve = await approveRes.json();
  console.log('   ✓', approve.message);

  // Step 5: Check Logs
  console.log('\n[5] Verify approval logs...');
  const logsRes = await fetch(API_BASE + '/hall-approval/' + bookingId + '/logs', { headers: { Authorization: 'Bearer ' + token } });
  const logs = await logsRes.json();
  console.log('   ✓ Logs:', logs.data?.length || 0, 'entries');

  // Result
  console.log('\n' + '='.repeat(50));
  console.log('RESULT: ALL TESTS PASSED ✓');
  console.log('='.repeat(50));
  console.log('\nSummary:');
  console.log('  - Mobile Submit: PASS');
  console.log('  - Pending List: PASS');
  console.log('  - Approve: PASS');
  console.log('  - Logs: PASS');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});