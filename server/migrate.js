#!/usr/bin/env node

const knex = require('knex');
const path = require('path');
const fs = require('fs').promises;

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
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
      directory: path.join(__dirname, 'db', 'migrations'),
      extension: 'js',
      tableName: 'knex_migrations'
    },
  },
  sqlite: {
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
      directory: path.join(__dirname, 'db', 'migrations'),
      extension: 'js',
      tableName: 'knex_migrations'
    },
  }
};

async function runMigrations(dbType = 'mysql', action = 'latest') {
  const db = knex(config[dbType]);
  
  try {
    console.log(`Running ${action} migrations on ${dbType.toUpperCase()}...`);
    
    switch (action) {
      case 'latest':
        await db.migrate.latest();
        console.log('✅ All migrations completed successfully');
        break;
      case 'rollback':
        await db.migrate.rollback();
        console.log('✅ Rollback completed successfully');
        break;
      case 'status':
        const [completed, pending] = await db.migrate.list();
        console.log('📋 Migration Status:');
        console.log(`Completed: ${completed.length}`);
        console.log(`Pending: ${pending.length}`);
        if (pending.length > 0) {
          console.log('Pending migrations:', pending.map(m => m.file || m.name));
        }
        break;
      case 'make':
        const migrationName = process.argv[4];
        if (!migrationName) {
          console.error('❌ Please provide a migration name: npm run migrate:make <name>');
          process.exit(1);
        }
        await db.migrate.make(migrationName);
        console.log(`✅ Created migration: ${migrationName}`);
        break;
      default:
        console.error('❌ Unknown action. Use: latest, rollback, status, or make');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Parse command line arguments
const dbType = process.argv[2] || 'mysql';
const action = process.argv[3] || 'latest';

if (!['mysql', 'sqlite'].includes(dbType)) {
  console.error('❌ Database type must be "mysql" or "sqlite"');
  process.exit(1);
}

runMigrations(dbType, action);