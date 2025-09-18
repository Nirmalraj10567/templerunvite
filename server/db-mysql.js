const knex = require('knex');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'rootroot',
    database: process.env.MYSQL_DATABASE || 'templerun',
    multipleStatements: true,
  },
  pool: { 
    min: 0, 
    max: 10,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  acquireConnectionTimeout: 60000,
});

// Test connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ MySQL database connected successfully');
  })
  .catch((err) => {
    console.error('❌ MySQL database connection failed:', err.message);
  });

module.exports = db;