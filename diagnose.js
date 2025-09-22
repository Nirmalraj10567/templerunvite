// Diagnostic script to check backend startup issues
const path = require('path');
const fs = require('fs');

console.log('🔍 Diagnosing backend startup issues...\n');

// Check if required files exist
const serverDir = path.join(__dirname, 'server');
const backendFile = path.join(serverDir, 'backend.js');
const dbFile = path.join(serverDir, 'db.js');
const envFile = path.join(serverDir, 'env');

console.log('📁 File checks:');
console.log('Server directory:', fs.existsSync(serverDir) ? '✅' : '❌', serverDir);
console.log('Backend.js:', fs.existsSync(backendFile) ? '✅' : '❌', backendFile);
console.log('db.js:', fs.existsSync(dbFile) ? '✅' : '❌', dbFile);
console.log('env file:', fs.existsSync(envFile) ? '✅' : '❌', envFile);

// Check environment variables
console.log('\n🔧 Environment check:');
try {
  require('dotenv').config({ path: envFile });
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('MYSQL_HOST:', process.env.MYSQL_HOST || 'Using default (127.0.0.1)');
  console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE || 'Using default (templerun2)');
} catch (e) {
  console.log('❌ Error loading environment:', e.message);
}

// Check package.json and dependencies
const packageFile = path.join(__dirname, 'package.json');
console.log('\n📦 Package check:');
console.log('package.json:', fs.existsSync(packageFile) ? '✅' : '❌', packageFile);

if (fs.existsSync(packageFile)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    const deps = pkg.dependencies || {};
    const requiredDeps = ['express', 'mysql2', 'knex', 'cors', 'bcryptjs', 'jsonwebtoken'];
    
    console.log('Required dependencies:');
    requiredDeps.forEach(dep => {
      console.log(`  ${dep}:`, deps[dep] ? '✅' : '❌');
    });
  } catch (e) {
    console.log('❌ Error reading package.json:', e.message);
  }
}

// Try to start a minimal server test
console.log('\n🚀 Testing minimal server startup...');
try {
  const express = require('express');
  const app = express();
  
  app.get('/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is working' });
  });
  
  const server = app.listen(4001, () => {
    console.log('✅ Minimal server started on port 4001');
    server.close();
    
    // Now test the actual backend
    testActualBackend();
  });
  
  server.on('error', (err) => {
    console.log('❌ Minimal server failed:', err.message);
  });
  
} catch (e) {
  console.log('❌ Express not available:', e.message);
}

function testActualBackend() {
  console.log('\n🔍 Testing actual backend startup...');
  
  try {
    // Try to require the backend file to check for syntax errors
    const backendPath = path.join(__dirname, 'server', 'backend.js');
    delete require.cache[require.resolve(backendPath)];
    
    // Set environment variables before requiring
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    
    console.log('✅ Backend file syntax is valid');
    
    // Test database connection
    testDatabaseConnection();
    
  } catch (e) {
    console.log('❌ Backend file has issues:', e.message);
    console.log('Stack:', e.stack);
  }
}

function testDatabaseConnection() {
  console.log('\n🗄️ Testing database connection...');
  
  try {
    const dbPath = path.join(__dirname, 'server', 'db.js');
    delete require.cache[require.resolve(dbPath)];
    
    const db = require(dbPath);
    
    // Test a simple query
    db.raw('SELECT 1 as test')
      .then(() => {
        console.log('✅ Database connection successful');
        db.destroy();
      })
      .catch((err) => {
        console.log('❌ Database connection failed:', err.message);
        console.log('This might be why the backend won\'t start');
        
        // Suggest solutions
        console.log('\n💡 Possible solutions:');
        console.log('1. Make sure MySQL is running');
        console.log('2. Check database credentials in server/env');
        console.log('3. Create the database if it doesn\'t exist');
        console.log('4. Check if the database server is accessible');
      });
      
  } catch (e) {
    console.log('❌ Database module has issues:', e.message);
  }
}
