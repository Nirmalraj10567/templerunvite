/**
 * Daybook Quick Setup & Test Script
 * 
 * This script helps you set up and test the daybook feature
 * Run with: node setup-daybook.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('DAYBOOK SETUP & TEST SCRIPT');
console.log('='.repeat(60));
console.log('');

// Step 1: Check if migration file exists
console.log('📋 Step 1: Checking migration file...');
const migrationFile = path.join(__dirname, 'migrations', '20260414_create_daybook_tables.sql');
if (fs.existsSync(migrationFile)) {
  console.log('✅ Migration file found');
} else {
  console.log('❌ Migration file not found!');
  process.exit(1);
}

// Step 2: Run migration
console.log('');
console.log('🗄️  Step 2: Running database migration...');
try {
  execSync('npm run migrate', { stdio: 'inherit' });
  console.log('✅ Migration completed');
} catch (error) {
  console.log('⚠️  Migration failed or already applied');
  console.log('If tables already exist, you can skip this step');
}

// Step 3: Check if server is running
console.log('');
console.log('🖥️  Step 3: Checking if server is running...');
const http = require('http');

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4000/api/daybook', (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

checkServer().then(isRunning => {
  if (isRunning) {
    console.log('✅ Server is running on port 4000');
    console.log('');
    console.log('🚀 Step 4: Running tests...');
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    
    // Run the test suite
    try {
      execSync('node daybook.test.js', { stdio: 'inherit' });
    } catch (error) {
      console.log('');
      console.log('⚠️  Tests completed with some failures');
      console.log('Check the test output above for details');
    }
  } else {
    console.log('❌ Server is NOT running on port 4000');
    console.log('');
    console.log('Please start the server first:');
    console.log('  npm run dev');
    console.log('');
    console.log('Then run tests:');
    console.log('  node daybook.test.js');
    console.log('  OR');
    console.log('  run-daybook-tests.bat');
  }
});
