# Annadhanam Logging Implementation

## Overview
Added comprehensive logging functionality to the Annadhanam system to track all create, update, and delete operations.

## Database Schema
Created `annadhanam_logs` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS `annadhanam_logs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `temple_id` INT NOT NULL,
  `annadhanam_id` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
  `details` TEXT, -- JSON string with full snapshot/diff
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_annadhanam_logs_temple_id` (`temple_id`),
  INDEX `idx_annadhanam_logs_annadhanam_id` (`annadhanam_id`),
  INDEX `idx_annadhanam_logs_action` (`action`),
  INDEX `idx_annadhanam_logs_created_at` (`created_at`),
  CONSTRAINT `annadhanam_logs_fk_annadhanam` FOREIGN KEY (`annadhanam_id`) REFERENCES `annadhanam`(`id`) ON DELETE CASCADE,
  CONSTRAINT `annadhanam_logs_fk_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Backend Implementation

### 1. Logging Helper Function
Added `logAnnadhanamAction()` function in `server/annadhanam.js` that:
- Automatically creates the `annadhanam_logs` table if it doesn't exist
- Logs actions with full details
- Handles errors gracefully without failing the main operation

### 2. Logging Integration
Added logging to all CRUD operations:

#### Create Operation
- Logs with action: `'create'`
- Stores full snapshot of the created record
- Includes user ID who performed the action

#### Update Operation  
- Logs with action: `'update'`
- Stores before/after state (after state only in current implementation)
- Tracks who made the changes

#### Delete Operation
- Logs with action: `'delete'`
- Stores the complete record before deletion
- Records who performed the deletion

### 3. API Endpoints
Added two new endpoints for retrieving logs:

#### Get Logs for Specific Annadhanam Entry
```
GET /api/annadhanam/:id/logs
```
Returns logs for a specific annadhanam entry.

#### Get All Logs for Temple
```
GET /api/annadhanam/logs?page=1&pageSize=50
```
Returns paginated logs for all annadhanam entries in the temple.

## Log Data Structure
Each log entry contains:
- `id`: Unique log entry ID
- `annadhanam_id`: ID of the annadhanam entry
- `action`: 'create', 'update', or 'delete'
- `created_at`: Timestamp of the action
- `created_by`: User ID who performed the action
- `details`: JSON object with full record data or before/after states

## Usage Examples

### Get Logs for Specific Entry
```bash
curl -X GET "https://templeapi.agniplay.com/api/annadhanam/123/logs" \
  -H "Authorization: Bearer your-token"
```

### Get All Logs with Pagination
```bash
curl -X GET "https://templeapi.agniplay.com/api/annadhanam/logs?page=1&pageSize=20" \
  -H "Authorization: Bearer your-token"
```

## Benefits
1. **Audit Trail**: Complete history of all annadhanam operations
2. **User Tracking**: Know who performed each action
3. **Data Recovery**: Can reconstruct deleted records from logs
4. **Compliance**: Meets audit requirements for temple management
5. **Debugging**: Easy to trace issues and changes

## Files Modified
- `server/annadhanam.js` - Added logging functionality
- `server/migrations/create-annadhanam-logs-table.sql` - Database schema

## Next Steps
1. Run the migration to create the `annadhanam_logs` table
2. Test the logging functionality by performing CRUD operations
3. Verify logs are being created correctly
4. Optionally add log viewing functionality to the frontend

## Testing
Use the following curl commands to test:

```bash
# Create an annadhanam entry (will be logged)
curl -X POST https://templeapi.agniplay.com/api/annadhanam \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"name": "Test User", "mobileNumber": "9876543210", "time": "10:00", "fromDate": "2025-09-28", "toDate": "2025-09-28"}'

# Check logs for the created entry
curl -X GET "https://templeapi.agniplay.com/api/annadhanam/logs" \
  -H "Authorization: Bearer your-token"
```
