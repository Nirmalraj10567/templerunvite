const base = 'http://localhost:4000';
const today = '2099-12-31';
const name = 'Full Flow ' + Math.random().toString(36).slice(2, 8);

async function main() {
  // 1. Login
  const loginRes = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_admin', password: 'test123' })
  });
  const login = await loginRes.json();
  if (!loginRes.ok) throw new Error('login failed: ' + JSON.stringify(login));
  console.log('STEP 1 - Login OK:', login.user.username, '@ temple', login.user.templeId);

  const token = login.token;
  const hdr = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  // 2. Create money donation
  const body = {
    registerNo: 'FF-' + Date.now(),
    date: today,
    name: name,
    fatherName: 'Test Father',
    address: 'Test Address',
    village: 'Test Village',
    phone: '9999999999',
    amount: 999,
    reason: 'Full flow test',
    transferTo: 'INCOME A/C',
    fromAccount: 'DONATION A/C'
  };
  const cr = await fetch(base + '/api/money-donations', {
    method: 'POST',
    headers: hdr,
    body: JSON.stringify(body)
  });
  const c = await cr.json();
  if (!cr.ok) throw new Error('create failed: ' + JSON.stringify(c));
  const id = c.data.id;
  console.log('STEP 2 - Donation Created: id=' + id, 'amount=' + c.data.amount);

  // 3. Check daybook
  const dbR = await fetch(base + `/api/daybook?q=${encodeURIComponent(name)}&from=${today}&to=${today}&pageSize=20`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const dbJ = await dbR.json();
  const match = (dbJ.data || []).find(r => r.reference_type === 'money_donation' && r.reference_id === id);
  console.log('STEP 3 - Daybook Match:', !!match, match ? 'receipt=' + match.receipt_number + ' type=' + match.entry_type : 'NONE');

  // 4. Check daily report
  const rpR = await fetch(base + `/api/reports/daily?date=${today}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const rp = await rpR.json();
  if (!rpR.ok) throw new Error('report failed: ' + JSON.stringify(rp));
  const dt = Number(rp.data.breakdown.income.donations_total || 0);
  console.log('STEP 4 - Daily Report:', 'donations_total=' + dt, 'net=' + rp.data.totals.net);

  // 5. Summary
  console.log('\n=== RESULT ===');
  console.log('Donation created:  id=' + id + '  amount=999');
  console.log('Daybook entry:     ' + (match ? 'YES - receipt=' + match.receipt_number : 'MISSING'));
  console.log('Daily report show: ' + dt + ' (expected 999)');
  console.log('PASS:', !!match && dt === 999 ? 'YES' : 'NO');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
