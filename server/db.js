const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'rootroot',
    database: process.env.MYSQL_DATABASE || 'templefinals',
    timezone: process.env.MYSQL_TIMEZONE || 'Z',
  },
  pool: { min: 2, max: 10 },
});

module.exports = db;

