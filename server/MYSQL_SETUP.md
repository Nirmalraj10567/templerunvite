# Asset Management - MySQL Setup Guide

This guide walks you through setting up the asset management system with MySQL.

## Prerequisites

- MySQL 5.7+ or MySQL 8.0+ installed and running
- Node.js 16+ installed
- Backend dependencies installed (`npm install` in server directory)

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the automated setup script:

```bash
cd /Volumes/KANINFOTECH/demo/templerunvite/server
./test-assets-mysql.sh
```

This script will:
1. Check MySQL connection
2. Create database if it doesn't exist
3. Run the migration
4. Start backend if needed
5. Run all API tests

### Option 2: Manual Setup

#### Step 1: Configure Environment

Create or edit `server/env` file:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=temple
MYSQL_TIMEZONE=Z
JWT_SECRET=your-secret-key-here
```

#### Step 2: Create Database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS temple CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### Step 3: Run Migration

```bash
cd /Volumes/KANINFOTECH/demo/templerunvite/server
node migrate-assets-mysql.js
```

#### Step 4: Start Backend

```bash
node backend.js
```

#### Step 5: Run Tests

In a new terminal:

```bash
cd /Volumes/KANINFOTECH/demo/templerunvite/server
node test-assets-api.js
```

## Files Created

| File | Purpose |
|------|---------|
| `migrations/20250410_create_assets_table_mysql.sql` | MySQL schema for assets and asset_logs tables |
| `migrate-assets-mysql.js` | Migration runner script |
| `test-assets-api.js` | Comprehensive API test suite |
| `test-assets-mysql.sh` | Automated setup and test script |
| `MYSQL_SETUP.md` | This documentation |

## MySQL Schema Overview

### assets table
```sql
CREATE TABLE assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  details TEXT,
  value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  asset_source VARCHAR(50),        -- 'purchase', 'donation', 'other'
  source_details TEXT,
  donor_name VARCHAR(255),
  donor_contact VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'converted', 'disposed'
  converted_at TIMESTAMP NULL,
  converted_by INT,
  conversion_income_id INT,        -- Reference to ledger entry
  created_by INT NOT NULL,
  temple_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### asset_logs table
```sql
CREATE TABLE asset_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,     -- 'create', 'update', 'delete', 'convert_to_cash'
  details JSON,                    -- MySQL JSON type for structured data
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:** Start MySQL service:
- macOS: `brew services start mysql`
- Ubuntu: `sudo service mysql start`
- Windows: Start MySQL service from Services panel

### Database Doesn't Exist

```
Error: ER_BAD_DB_ERROR: Unknown database 'temple'
```

**Solution:** Create the database:
```bash
mysql -u root -p -e "CREATE DATABASE temple;"
```

### Permission Denied

```
Error: ER_ACCESS_DENIED_ERROR
```

**Solution:** Check credentials in `env` file and ensure MySQL user has proper permissions.

### Table Already Exists

This is normal - the migration uses `CREATE TABLE IF NOT EXISTS` and will skip existing tables.

## API Endpoints

Once setup is complete, the following endpoints are available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assets` | Create new asset |
| GET | `/api/assets` | List all assets |
| GET | `/api/assets/:id` | Get single asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| POST | `/api/assets/:id/convert-to-cash` | Convert asset to cash |
| GET | `/api/assets/:id/logs` | Get asset audit logs |
| GET | `/api/assets/logs/all` | Get all logs (paginated) |

## Testing

The test suite covers:
1. Authentication (login)
2. Create asset with source tracking
3. List assets with temple filtering
4. Get single asset
5. Update asset
6. Get asset logs
7. Convert asset to cash (creates ledger entry)
8. Prevent update/delete of converted assets
9. Validation errors
10. Unauthorized access

## MySQL vs SQLite Differences

| Feature | MySQL | SQLite |
|---------|-------|--------|
| JSON columns | Native JSON type | TEXT (JSON stored as string) |
| Timestamps | `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` |
| Auto-increment | `AUTO_INCREMENT` | `AUTOINCREMENT` |
| Boolean | TINYINT(1) | INTEGER (0/1) |

The code uses Knex.js which abstracts these differences.

## Next Steps

After successful setup:
1. Create a test user with `asset_management` permission
2. Test the API using the test suite
3. Integrate with frontend components
