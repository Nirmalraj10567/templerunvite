# Temple Management System - Accounting Module

## Overview

This comprehensive accounting system provides full double-entry bookkeeping capabilities for temple management. It integrates seamlessly with existing entry forms (donations, pooja, hall bookings, tax, receipts, ledger) while maintaining proper accounting standards.

## Key Features

### 1. **Complete Chart of Accounts**
- **Assets**: Cash, Bank Accounts, Equipment, Building, Receivables
- **Liabilities**: Loans, Payables, Accrued Expenses
- **Equity**: Temple Fund, Retained Earnings, Opening Balance Equity
- **Income**: Donations, Pooja, Hall Rental, Tax Collection, Miscellaneous
- **Expenses**: Priest Salary, Utilities, Maintenance, Supplies, Administrative

### 2. **Double-Entry Bookkeeping**
- Every transaction creates balanced journal entries (Debits = Credits)
- Automatic validation ensures accounting equation balance
- Proper audit trail for all financial transactions

### 3. **Initial Balance Support**
- Setup wizard for creating chart of accounts
- Initial balance entry for existing temples
- Opening balance equity account for proper balance sheet

### 4. **Integration with Existing Forms**
- **Money Donations**: Auto-creates journal entries (Cash Dr, Donation Income Cr)
- **Pooja Entries**: Records pooja income with proper accounting
- **Hall Bookings**: Handles advance payments and receivables
- **Tax Collections**: Proper tax income recording
- **Receipt Entries**: General income/expense transactions
- **Ledger Entries**: Personal account management

### 5. **Financial Reports**
- **Trial Balance**: Verify accounting equation balance
- **Balance Sheet**: Assets, Liabilities, and Equity position
- **Income Statement**: Revenue and expenses for period
- **Account Balances**: Real-time account balance tracking

### 6. **Enhanced Validation**
- Balance validation for expense transactions
- Duplicate entry prevention
- Data integrity checks
- Proper account type validation

## File Structure

```
src/
├── services/
│   ├── accountingService.ts           # Core accounting operations
│   └── integratedAccountingService.ts # Integration with existing forms
├── pages/accounting/
│   ├── AccountingDashboard.tsx        # Main dashboard
│   ├── AccountManagementPage.tsx      # Chart of accounts management
│   ├── JournalEntryPage.tsx          # Manual journal entries
│   ├── AccountingReportsPage.tsx     # Financial reports
│   └── AccountingSetupWizard.tsx     # Initial setup wizard
└── App.tsx                           # Updated routing
```

## Setup Instructions

### 1. **Initial Setup**
1. Navigate to `/dashboard/accounting/setup`
2. Follow the setup wizard to create your chart of accounts
3. Set initial balances for existing accounts
4. Complete setup to start using the system

### 2. **Account Management**
- Access via `/dashboard/accounting/accounts`
- Create, edit, and manage chart of accounts
- Set account types, categories, and initial balances
- Activate/deactivate accounts as needed

### 3. **Journal Entries**
- Manual entries via `/dashboard/accounting/journal-entry`
- Automatic entries from existing forms (donations, pooja, etc.)
- Balanced entry validation (debits must equal credits)
- Reference number tracking for audit trail

### 4. **Reports**
- Access via `/dashboard/accounting/reports`
- Generate trial balance, balance sheet, income statement
- Filter by date ranges
- Export capabilities for external use

## Integration Details

### Existing Form Integration

The system automatically creates proper journal entries when users submit:

#### **Money Donations**
```
Dr. Cash Account          ₹X,XXX
    Cr. Donation Income       ₹X,XXX
```

#### **Pooja Entries**
```
Dr. Cash Account          ₹X,XXX
    Cr. Pooja Income          ₹X,XXX
```

#### **Hall Bookings**
```
Dr. Cash Account          ₹X,XXX (advance)
Dr. Accounts Receivable   ₹X,XXX (balance)
    Cr. Hall Rental Income    ₹X,XXX (total)
```

#### **Tax Collections**
```
Dr. Cash Account          ₹X,XXX
    Cr. Tax Income            ₹X,XXX
```

#### **Receipt Entries**
**Income:**
```
Dr. Cash Account          ₹X,XXX
    Cr. Miscellaneous Income  ₹X,XXX
```

**Expense:**
```
Dr. Miscellaneous Expense ₹X,XXX
    Cr. Cash Account          ₹X,XXX
```

### Validation Features

1. **Balance Validation**: Prevents expenses exceeding available cash
2. **Double-Entry Validation**: Ensures debits equal credits
3. **Account Type Validation**: Proper debit/credit based on account type
4. **Date Validation**: Prevents future-dated transactions (configurable)

## API Endpoints

### Account Management
- `GET /api/accounting/accounts` - List all accounts
- `POST /api/accounting/accounts` - Create new account
- `PUT /api/accounting/accounts/:id` - Update account
- `DELETE /api/accounting/accounts/:id` - Delete account
- `GET /api/accounting/accounts/:id/balance` - Get account balance

### Journal Entries
- `GET /api/accounting/journal-entries` - List journal entries
- `POST /api/accounting/journal-entries` - Create journal entry
- `PUT /api/accounting/journal-entries/:id` - Update journal entry
- `DELETE /api/accounting/journal-entries/:id` - Delete journal entry

### Reports
- `GET /api/accounting/reports/trial-balance` - Trial balance report
- `GET /api/accounting/reports/balance-sheet` - Balance sheet report
- `GET /api/accounting/reports/income-statement` - Income statement report

## Database Schema

### Accounts Table
```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE') NOT NULL,
  category VARCHAR(100) NOT NULL,
  parent_id INTEGER REFERENCES accounts(id),
  initial_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  temple_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Journal Entries Table
```sql
CREATE TABLE journal_entries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  reference_number VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  created_by INTEGER NOT NULL,
  temple_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Journal Entry Lines Table
```sql
CREATE TABLE journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Best Practices

### 1. **Account Naming**
- Use clear, descriptive account names
- Follow consistent naming conventions
- Group similar accounts with prefixes (e.g., "Bank - Current", "Bank - Savings")

### 2. **Journal Entry Descriptions**
- Include reference to source transaction
- Mention parties involved (donor name, devotee name, etc.)
- Add purpose or reason for transaction

### 3. **Regular Reconciliation**
- Run trial balance monthly to ensure books balance
- Reconcile bank accounts regularly
- Review account balances for accuracy

### 4. **Backup and Security**
- Regular database backups
- Restrict access to accounting functions
- Maintain audit trails for all changes

## Troubleshooting

### Common Issues

1. **Unbalanced Journal Entries**
   - Check that total debits equal total credits
   - Verify account types are correct
   - Ensure amounts are properly calculated

2. **Missing Accounts**
   - Run the setup wizard to create standard accounts
   - Manually create missing accounts via Account Management
   - Check account activation status

3. **Integration Issues**
   - Verify existing forms are calling integrated accounting service
   - Check API endpoints are responding correctly
   - Review error logs for specific issues

### Error Messages

- "Journal entry is not balanced": Debits don't equal credits
- "Insufficient balance": Expense exceeds available cash
- "Account not found": Referenced account doesn't exist
- "Invalid account type": Wrong debit/credit for account type

## Future Enhancements

1. **Multi-Currency Support**: Handle foreign currency transactions
2. **Budget Management**: Create and track budgets vs actuals
3. **Cash Flow Forecasting**: Predict future cash positions
4. **Advanced Reporting**: Custom report builder
5. **Mobile App Integration**: Mobile-friendly accounting interface
6. **Automated Reconciliation**: Bank statement import and matching
7. **Fixed Asset Management**: Depreciation tracking
8. **Payroll Integration**: Employee salary and benefits tracking

## Support

For technical support or questions about the accounting system:

1. Check this documentation first
2. Review error logs in browser console
3. Verify database connectivity and permissions
4. Contact system administrator for advanced issues

## Version History

- **v1.0.0**: Initial release with basic double-entry bookkeeping
- **v1.1.0**: Added integration with existing forms
- **v1.2.0**: Enhanced reporting capabilities
- **v1.3.0**: Setup wizard and initial balance support

---

This accounting system provides a solid foundation for temple financial management while maintaining compatibility with existing workflows. The double-entry system ensures accuracy and provides proper financial controls for temple operations.