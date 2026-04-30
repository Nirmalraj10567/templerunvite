
const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: '127.0.0.1', user: 'root', password: 'YourStrongPassword123', database: 'templerun' } });
async function run() {
  try {
    const poojas = await db('pooja').select('id', 'temple_id', 'name', 'receipt_number', 'amount');
    const journals = await db('journal_entries').where('reference_type', 'pooja').select('reference_id', 'amount');
    
    const journalMap = journals.reduce((acc, j) => {
      acc[j.reference_id] = j.amount;
      return acc;
    }, {});
    
    console.log('ID | Temple | Receipt | P. Amount | J. Amount | Match');
    console.log('---|--------|---------|-----------|-----------|-------');
    for (const p of poojas) {
      const pAmt = parseFloat(p.amount || 0);
      const jAmt = parseFloat(journalMap[p.id] || 0);
      const match = Math.abs(pAmt - jAmt) < 0.01 ? '✅' : '❌';
      console.log(`${p.id} | ${p.temple_id} | ${p.receipt_number} | ${pAmt.toFixed(2)} | ${jAmt.toFixed(2)} | ${match}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
