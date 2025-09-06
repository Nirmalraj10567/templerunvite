const axios = require('axios');

async function testMoonPhases() {
  try {
    const startDate = new Date('2025-09-01');
    const endDate = new Date('2025-09-30');
    
    console.log(`Testing moon phases from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const response = await axios.get('http://localhost:3000/api/moon-phases', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    
    console.log('Moon phases received:', response.data);
    
    // Verify we got all expected phases
    const phases = response.data;
    const phaseTypes = new Set(phases.map(p => p.phase));
    
    console.log('Phase types found:', Array.from(phaseTypes));
    console.log('Total phases in period:', phases.length);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testMoonPhases();
