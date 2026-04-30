const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'YourStrongPassword123',
    database: 'templerun',
  }
});

async function testBalanceSheet() {
  console.log('=== Balance Sheet Test ===\n');
  
  const startDate = '2025-01-01';
  const endDate = '2025-03-31';
  
  try {
    // Get journal entries in date range
    console.log('1. Getting journal entries...');
    const entries = await knex('journal_entries')
      .whereBetween('date', [startDate, endDate]);
    console.log(`   Found ${entries.length} entries`);
    
    // Calculate balances by account (like balance sheet API does)
    console.log('\n2. Calculating balances...');
    const map = {};
    
    for (const entry of entries) {
      const toAcc = entry.to_account || 'Unknown';
      const fromAcc = entry.from_account || 'Unknown';
      const amt = Number(entry.amount || 0);
      
      if (!map[toAcc]) map[toAcc] = { inflow: 0, outflow: 0 };
      map[toAcc].inflow += amt;
      
      if (!map[fromAcc]) map[fromAcc] = { inflow: 0, outflow: 0 };
      map[fromAcc].outflow += amt;
    }
    
    const assets = [];
    const liabilities = [];
    
    for (const [account, bal] of Object.entries(map)) {
      const net = bal.inflow - bal.outflow;
      if (net >= 0) {
        assets.push({ account, balance: net });
      } else {
        liabilities.push({ account, balance: Math.abs(net) });
      }
    }
    
    console.log(`   Assets: ${assets.length} items`);
    console.log(`   Liabilities: ${liabilities.length} items`);
    
    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    
    console.log('\n3. Balance Sheet:');
    console.log(`   Total Assets: ${totalAssets.toFixed(2)}`);
    console.log(`   Total Liabilities: ${totalLiabilities.toFixed(2)}`);
    console.log(`   Difference: ${Math.abs(totalAssets - totalLiabilities).toFixed(2)}`);
    
    // Show items
    console.log('\n4. Assets:');
    assets.forEach(a => console.log(`   - ${a.account}: ${a.balance.toFixed(2)}`));
    
    console.log('\n5. Liabilities:');
    liabilities.forEach(l => console.log(`   - ${l.account}: ${l.balance.toFixed(2)}`));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

testBalanceSheet();
