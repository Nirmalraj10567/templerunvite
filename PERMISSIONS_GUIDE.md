# Enhanced Permission System Guide

## Overview

The temple management system now features a comprehensive permission system that allows fine-grained control over user access to different features and operations.

## Permission Levels

The system supports three access levels in hierarchical order:

1. **View** - Read-only access to data
2. **Edit** - Can create and modify data
3. **Full** - Complete access including delete operations

## Available Permissions

### Core Permissions

| Permission ID | Label | Description | Typical Use Cases |
|---------------|-------|-------------|-------------------|
| `member_entry` | Member Entry | Add, edit, and manage member registrations | Registration staff, admins |
| `member_view` | Member View | View member list and details | All authenticated users |
| `master_data` | Master Data | Manage groups, clans, occupations, villages, educations | Data administrators |
| `ledger_management` | Ledger Management | Manage financial records and transactions | Accountants, treasurers |
| `session_logs` | Session Logs | View user login/logout activities | Security administrators |
| `activity_logs` | Activity Logs | View system activity and audit logs | System administrators |
| `user_management` | User Management | Create and manage user accounts | HR, system administrators |
| `temple_settings` | Temple Settings | Manage temple configuration and settings | Temple administrators |
| `reports` | Reports | Generate and view system reports | Management, analysts |
| `backup_restore` | Backup & Restore | Database backup and restore operations | IT administrators |

## Default Role Permissions

### Superadmin (mobile: 9999999999)
- **All permissions** with **Full** access level
- Automatic bypass for all permission checks

### Admin Role
- Member Entry: Full
- Member View: Full  
- Master Data: Full
- Ledger Management: Edit
- Session Logs: View
- Activity Logs: View
- User Management: Edit
- Reports: View

### Member Role
- Member View: View
- Master Data: View

## API Endpoints and Required Permissions

### Member Management
- `POST /api/members` - Requires: `member_entry` (Full)
- `GET /api/members` - Requires: `member_view` (View)

### Master Data
- `POST /api/master-*` - Requires: `master_data` (Edit)
- `GET /api/master-*` - Requires: `master_data` (View)
- `PUT /api/master-*` - Requires: `master_data` (Edit)
- `DELETE /api/master-*` - Requires: `master_data` (Full)

### Ledger Management
- `POST /api/ledger` - Requires: `ledger_management` (Edit)
- `GET /api/ledger` - Requires: `ledger_management` (View)
- `PUT /api/ledger` - Requires: `ledger_management` (Edit)
- `DELETE /api/ledger` - Requires: `ledger_management` (Full)

### User Management
- `POST /api/register` - Requires: `user_management` (Edit)
- `PUT /api/users/:id` - Requires: `user_management` (Edit)

### Logs and Monitoring
- `GET /api/sessions` - Requires: `session_logs` (View)
- `GET /api/activity-logs` - Requires: `activity_logs` (View)

## Frontend Integration

### Member Entry Form

The enhanced member entry form now includes:

1. **Comprehensive Permission List** - All 10 permission categories
2. **Permission Descriptions** - Clear explanations for each permission
3. **Access Level Selection** - View, Edit, or Full access for each permission
4. **Bulk Actions** - Select All and Clear All buttons
5. **Visual Indicators** - Better UI with cards and descriptions

### Permission Management Features

- **Select All**: Grants view-level access to all permissions
- **Clear All**: Removes all custom permissions
- **Individual Control**: Each permission can be toggled and access level adjusted
- **Superadmin Indicator**: Special handling for superadmin accounts

## Database Schema

### user_permissions Table

```sql
CREATE TABLE user_permissions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL,
  access_level ENUM('view', 'edit', 'full', 'none') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission_id)
);
```

## Migration

The system includes automatic migration that:

1. Grants full permissions to superadmin users
2. Assigns appropriate permissions to existing admin users
3. Provides basic permissions to member users
4. Updates any 'none' access levels to 'view'

## Testing

Use the provided test script to verify the permission system:

```bash
cd server
node test-permissions.js
```

## Security Considerations

1. **Superadmin Bypass**: Users with mobile '9999999999' bypass all permission checks
2. **Temple Isolation**: Users can only manage data within their assigned temple
3. **Hierarchical Access**: Higher access levels include lower level permissions
4. **Token Validation**: All endpoints require valid JWT authentication

## Best Practices

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Regular Audits**: Review user permissions periodically
3. **Role-Based Assignment**: Use consistent permission sets for similar roles
4. **Documentation**: Keep permission assignments documented
5. **Testing**: Verify permission changes in a test environment first

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check if user has required permission and access level
2. **Superadmin Issues**: Verify mobile number is exactly '9999999999'
3. **Temple Access**: Ensure user's templeId matches the resource being accessed
4. **Migration Problems**: Check server logs for migration errors

### Debug Endpoints

- `GET /api/permissions` - List all available permissions
- Check user permissions in login response
- Review server logs for permission check failures