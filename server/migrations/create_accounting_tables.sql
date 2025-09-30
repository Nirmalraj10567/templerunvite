-- Accounting System Database Migration
-- Creates tables for double-entry bookkeeping system

-- Create accounts table (without foreign key first)
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE') NOT NULL,
  category VARCHAR(100) NOT NULL,
  parent_id INT NULL,
  initial_balance DECIMAL(15,2) DEFAULT 0.00,
  current_balance DECIMAL(15,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  temple_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_code_temple (code, temple_id),
  INDEX idx_temple_type (temple_id, type),
  INDEX idx_temple_active (temple_id, is_active)
);

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  reference_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  created_by INT NOT NULL,
  temple_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_reference_temple (reference_number, temple_id),
  INDEX idx_temple_date (temple_id, date),
  INDEX idx_temple_created_by (temple_id, created_by)
);

-- Create journal_entry_lines table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id INT NOT NULL,
  account_id INT NOT NULL,
  debit_amount DECIMAL(15,2) DEFAULT 0.00,
  credit_amount DECIMAL(15,2) DEFAULT 0.00,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_journal_entry (journal_entry_id),
  INDEX idx_account (account_id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

-- Create account_balances table for performance (optional - can be computed from journal_entry_lines)
CREATE TABLE IF NOT EXISTS account_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  balance_date DATE NOT NULL,
  debit_balance DECIMAL(15,2) DEFAULT 0.00,
  credit_balance DECIMAL(15,2) DEFAULT 0.00,
  running_balance DECIMAL(15,2) DEFAULT 0.00,
  temple_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_account_date (account_id, balance_date),
  INDEX idx_temple_date (temple_id, balance_date),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Insert default chart of accounts for new temples
-- This will be handled by the setup wizard, but we can provide a template

-- Triggers to update account balances when journal entries are created/updated
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS update_account_balance_after_insert
AFTER INSERT ON journal_entry_lines
FOR EACH ROW
BEGIN
  -- Update the current_balance in accounts table
  UPDATE accounts 
  SET current_balance = current_balance + NEW.credit_amount - NEW.debit_amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.account_id;
END$$

CREATE TRIGGER IF NOT EXISTS update_account_balance_after_update
AFTER UPDATE ON journal_entry_lines
FOR EACH ROW
BEGIN
  -- Reverse old amounts and apply new amounts
  UPDATE accounts 
  SET current_balance = current_balance - OLD.credit_amount + OLD.debit_amount + NEW.credit_amount - NEW.debit_amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.account_id;
END$$

CREATE TRIGGER IF NOT EXISTS update_account_balance_after_delete
AFTER DELETE ON journal_entry_lines
FOR EACH ROW
BEGIN
  -- Reverse the deleted amounts
  UPDATE accounts 
  SET current_balance = current_balance - OLD.credit_amount + OLD.debit_amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.account_id;
END$$

DELIMITER ;

-- Add self-referencing foreign key for accounts parent_id
ALTER TABLE accounts 
ADD CONSTRAINT fk_accounts_parent 
FOREIGN KEY (parent_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_temple_type_active ON accounts(temple_id, type, is_active);
CREATE INDEX IF NOT EXISTS idx_journal_entries_temple_date ON journal_entries(temple_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_amounts ON journal_entry_lines(debit_amount, credit_amount);

-- Add constraints to ensure data integrity
ALTER TABLE journal_entry_lines 
ADD CONSTRAINT chk_amounts_not_both_zero 
CHECK (debit_amount > 0 OR credit_amount > 0);

ALTER TABLE journal_entry_lines 
ADD CONSTRAINT chk_amounts_not_both_nonzero 
CHECK (NOT (debit_amount > 0 AND credit_amount > 0));

-- Add comment for documentation
ALTER TABLE accounts COMMENT = 'Chart of accounts for double-entry bookkeeping';
ALTER TABLE journal_entries COMMENT = 'Journal entries header table';
ALTER TABLE journal_entry_lines COMMENT = 'Journal entry line items with debits and credits';
ALTER TABLE account_balances COMMENT = 'Account balance snapshots for performance';