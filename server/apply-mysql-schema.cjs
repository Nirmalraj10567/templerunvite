#!/usr/bin/env node
/**
 * Apply the full MySQL schema from mysql_schema_fixed.sql
 * - Reads ./../mysql_schema_fixed.sql and executes it against MySQL
 * - Creates the database if it doesn't exist
 *
 * Env vars (optional, defaults provided):
 *   MYSQL_HOST=127.0.0.1
 *   MYSQL_PORT=3306
 *   MYSQL_USER=root
 *   MYSQL_PASSWORD=rootroot
 *   MYSQL_DATABASE=templerun
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const {
  MYSQL_HOST = '127.0.0.1',
  MYSQL_PORT = '3306',
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = 'rootroot',
  MYSQL_DATABASE = 'templerun',
} = process.env;

async function ensureDatabase() {
  // Connect without database to create if missing
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  } finally {
    await conn.end();
  }
}

async function applySchema() {
  const schemaPath = path.join(__dirname, '..', 'mysql_schema_fixed.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    multipleStatements: true,
  });

  console.log(`Applying schema to MySQL: ${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`);
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

(async () => {
  try {
    await ensureDatabase();
    await applySchema();
    console.log('✅ Schema applied successfully.');
  } catch (err) {
    console.error('❌ Failed to apply schema:', err.message);
    process.exit(1);
  }
})();
