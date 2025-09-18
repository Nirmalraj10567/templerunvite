// Knex configuration for running migrations
// Supports both SQLite (current project default) and MySQL (optional)

const path = require('path');

const migrationsDir = path.join(__dirname, 'db', 'migrations');

module.exports = {
  // Default: SQLite in server/deev.sqlite3
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'deev.sqlite3'),
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON');
        conn.run('PRAGMA busy_timeout = 5000');
        cb();
      },
    },
    migrations: {
      directory: migrationsDir,
      extension: 'js',
    },
  },

  // Optional: MySQL target (configure env vars before using)
  mysql: {
    client: 'mysql2',
    connection: {
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'rootroot',
      database: process.env.MYSQL_DATABASE || 'templerun',
      multipleStatements: true,
    },
    pool: { min: 0, max: 10 },
    migrations: {
      directory: migrationsDir,
      extension: 'js',
    },
  },
};
