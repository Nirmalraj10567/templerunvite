#!/usr/bin/env node
/*
  Simple SQL migration runner.
  - Executes all .sql files in server/db/migrations in filename order (ascending)
  - Works with SQLite (default) and MySQL (when NODE_ENV=mysql)
  - Idempotent-ish if your SQL files are written to be safe on re-run (use IF NOT EXISTS, etc.)
*/
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

const migrationsDir = path.join(__dirname, 'db', 'migrations');

async function runSqlite(sqlFiles) {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'deev.sqlite3');
  const db = new sqlite3.Database(dbPath);
  console.log(`Using SQLite DB: ${dbPath}`);

  await new Promise((resolve, reject) => db.serialize(async () => {
    try {
      db.run('PRAGMA foreign_keys = ON');
      db.run('PRAGMA busy_timeout = 5000');
      for (const file of sqlFiles) {
        const full = path.join(migrationsDir, file);
        const sql = await readFile(full, 'utf8');
        console.log(`\n--- Running SQL migration: ${file} ---`);
        await new Promise((res) => {
          db.exec(sql, (err) => {
            if (err) {
              const msg = String(err && err.message || '').toLowerCase();
              // Tolerate idempotent cases: column/table/index already exists
              if (msg.includes('duplicate column name') ||
                  msg.includes('already exists') ||
                  msg.includes('duplicate key name') ||
                  msg.includes('duplicate column')) {
                console.warn(`⚠️  Skipping non-fatal migration error in ${file}: ${err.message}`);
                return res();
              }
              console.error(`❌ Migration error in ${file}:`, err);
              return reject(err);
            }
            res();
          });
        });
      }
      resolve();
    } catch (e) { reject(e); }
  }));

  await new Promise((resolve) => db.close(() => resolve()));
}

async function runMysql(sqlFiles) {
  const mysql = require('mysql2/promise');
  const {
    MYSQL_HOST = '127.0.0.1',
    MYSQL_PORT = '3306',
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = 'rootroot',
    MYSQL_DATABASE = 'templerun',
  } = process.env;

  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    multipleStatements: true,
  });
  console.log(`Using MySQL DB: ${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`);

  try {
    for (const file of sqlFiles) {
      const full = path.join(migrationsDir, file);
      let sql = await readFile(full, 'utf8');
      console.log(`\n--- Running SQL migration: ${file} ---`);
      // Basic cleanup: remove SQLite-specific PRAGMAs if any leaked in
      sql = sql.replace(/PRAGMA[^;]+;/gi, '');
      try {
        await conn.query(sql);
      } catch (err) {
        const msg = String(err && err.message || '').toLowerCase();
        // Ignore idempotent errors for MySQL
        if (msg.includes('duplicate column name') ||
            msg.includes('duplicate column') ||
            msg.includes('already exists') ||
            msg.includes('er_dup_fieldname') ||
            msg.includes('errno: 1060') || // Duplicate column
            msg.includes('errno: 1050')) { // Table exists
          console.warn(`⚠️  Skipping non-fatal migration error in ${file}: ${err.message}`);
          continue;
        }
        throw err;
      }
    }
  } finally {
    await conn.end();
  }
}

async function main() {
  const all = await readdir(migrationsDir);
  const sqlFiles = all.filter(f => f.toLowerCase().endsWith('.sql')).sort();

  if (sqlFiles.length === 0) {
    console.log('No .sql migrations found in', migrationsDir);
    return;
  }

  const target = (process.env.NODE_ENV || 'development').toLowerCase();
  if (target === 'mysql') {
    await runMysql(sqlFiles);
  } else {
    await runSqlite(sqlFiles);
  }

  console.log('\n✅ SQL migrations completed.');
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
