# Asset Management API - Flowchart Implementation

This document describes the complete property/asset management backend implementation based on the provided flowchart.

## Overview

The implementation follows the flowchart's five main operations:
1. **Create** - Add Property with Source Tracking
2. **View** - List Properties
3. **Update** - Edit Property with Ownership Verification
4. **Delete** - Delete Property with Ownership Verification
5. **Convert to Cash** - Asset Conversion to Income Entry

## Database Schema

### assets table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| name | TEXT NOT NULL | Asset name |
| details | TEXT | Asset details/description |
| value | DECIMAL(12,2) | Asset value |
| asset_source | TEXT | 'purchase', 'donation', 'other' |
| source_details | TEXT | Additional source info (e.g., "Audio Set Example: 10") |
| donor_name | TEXT | Name of donor (if donated) |
| donor_contact | TEXT | Contact info of donor |
| status | TEXT DEFAULT 'active' | 'active', 'converted', 'disposed' |
| converted_at | TIMESTAMP | When asset was converted to cash |
| converted_by | INTEGER | User ID who converted |
| conversion_income_id | INTEGER | Reference to ledger entry |
| created_by | INTEGER NOT NULL | User who created |
| temple_id | INTEGER NOT NULL | Temple ownership |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### asset_logs table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| asset_id | INTEGER NOT NULL | Reference to asset |
| action | TEXT NOT NULL | 'create', 'update', 'delete', 'convert_to_cash' |
| details | TEXT | JSON with before/after data |
| created_by | INTEGER | User who performed action |
| created_at | TIMESTAMP | Action time |

## API Endpoints

### Base URL: `/api/assets`

Authentication required for all endpoints (JWT token in Authorization header).
Permission: `asset_management` (view or full)

#### 1. Create Asset (POST /)

**Flow:** Add Property Form → Property Details → Source Tracking → Validate → Set Temple ID → Insert → Log Creation → Return 201

**Request Body:**
```json
{
  "name": "Audio Set",
  "details": "Complete audio system with speakers",
  "value": 10000,
  "asset_source": "donation",
  "source_details": "Audio Set Example: 10 comes from where",
  "donor_name": "John Doe",
  "donor_contact": "9876543210"
}
```

**Response (201):**
```json
{
  "success": true,
  "assetId": 1,
  "message": "Property registered successfully"
}
```

#### 2. List Assets (GET /)

**Flow:** List Properties → Query Table → Filter by Temple ID → Order by Updated At → Return Property List

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

#### 3. Get Single Asset (GET /:id)

**Flow:** Load Property Data → Verify Ownership → Return Data

**Response (200):**
```json
{
  "success": true,
  "data": { ...asset object... }
}
```

#### 4. Update Asset (PUT /:id)

**Flow:** Edit Property → Load Property Data → Verify Ownership → Authorized? → Update Fields → Update Database → Log Update → Return 200 Success

**Request Body:** Same as Create

**Response (200):**
```json
{
  "success": true,
  "message": "Property updated successfully"
}
```

#### 5. Delete Asset (DELETE /:id)

**Flow:** Delete Property → Verify Ownership → Authorized? → Log Deletion → Delete Property → Return 200 Success

**Response (200):**
```json
{
  "success": true,
  "message": "Property deleted successfully"
}
```

#### 6. Convert to Cash (POST /:id/convert-to-cash)

**Flow:** Asset Conversion → Load Asset Data → Asset Value > 0? → Initiate Conversion → Create Income Entry → Update Ledger → Mark Asset as Converted → Log Conversion → Return Success

**Response (200):**
```json
{
  "success": true,
  "message": "Asset successfully converted to cash",
  "incomeEntryId": 123,
  "convertedValue": 10000
}
```

When an asset is converted:
1. Creates a ledger entry with `under: 'INCOME A/C'` and `type: 'credit'`
2. Ledger entry name: `"Asset Conversion: {asset.name}"`
3. Asset status changes to `'converted'`
4. Logs the conversion action

#### 7. Get Asset Logs (GET /:id/logs)

**Response (200):**
```json
{
  "success": true,
  "data": [...log entries...]
}
```

#### 8. Get All Logs (GET /logs/all?page=1&pageSize=50)

**Response (200):**
```json
{
  "success": true,
  "data": [...logs...],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

## Permission Setup

Run the migration to add the permission:
```bash
cd /Volumes/KANINFOTECH/demo/templerunvite/server
sqlite3 database.sqlite3 < migrations/20250410_create_assets_table.sql
```

Or for MySQL:
```bash
mysql -u root -p temple_db < migrations/20250410_create_assets_table.sql
```

## Error Responses

- **400 Bad Request:** Missing/invalid fields, asset already converted, no value to convert
- **403 Forbidden:** Not authorized (wrong temple or insufficient permissions)
- **404 Not Found:** Asset not found
- **500 Internal Server Error:** Database or server errors

## Integration Notes

- The existing `/api/properties` endpoint was moved to `/api/property-tax` for property tax management
- New asset management uses `/api/assets` endpoint
- Both systems are completely separate with different tables and purposes
