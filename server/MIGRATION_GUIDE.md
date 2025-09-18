# MySQL Migration Guide

## Setup

1. **Environment Configuration**
   Copy `.env.example` to `.env` and configure your MySQL connection:
   ```bash
   cp .env.example .env
   ```
   
   Update the MySQL settings in `.env`:
   ```
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=templerun
   ```

2. **Database Creation**
   Create the database in MySQL:
   ```sql
   CREATE DATABASE templerun CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

## Migration Commands

### Run Migrations
```bash
# Run all pending migrations on MySQL
npm run migrate

# Or explicitly specify MySQL
npm run migrate:mysql

# Run migrations on SQLite (for development)
npm run migrate:sqlite
```

### Check Migration Status
```bash
npm run migrate:status
```

### Create New Migration
```bash
npm run migrate:make create_new_table
```

### Rollback Last Migration
```bash
npm run migrate:rollback
```

## Migration File Format

Create migration files in `server/db/migrations/` with this format:

```javascript
/**
 * Migration description
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('table_name', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.timestamps(true, true); // created_at, updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('table_name');
};
```

## Converting Existing SQL Migrations

Your existing SQL migrations in `server/migrations/` can be converted to JavaScript format for better cross-database compatibility.

Example conversion:
```sql
-- SQL format
CREATE TABLE example (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
```

```javascript
// JavaScript format
exports.up = function(knex) {
  return knex.schema.createTable('example', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
  });
};
```

## Database Connections

- **SQLite**: Use `require('./db.js')` (current default)
- **MySQL**: Use `require('./db-mysql.js')` (new MySQL connection)

## Tips

1. Always test migrations on a development database first
2. Create both `up` and `down` functions for rollback capability
3. Use transactions for complex migrations
4. Keep migrations small and focused on single changes
5. Use descriptive names with timestamps: `YYYYMMDD_description.js`