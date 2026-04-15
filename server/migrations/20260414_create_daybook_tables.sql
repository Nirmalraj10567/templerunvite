-- MySQL migration for daybook tables
-- Migration: 20260414_create_daybook_tables.sql

-- Create daybook_entries table
CREATE TABLE IF NOT EXISTS daybook_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temple_id INT NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(50) NOT NULL COMMENT 'income, expense, journal',
    description TEXT NOT NULL,
    reference_type VARCHAR(100) COMMENT 'donation, annadhanam, pooja, ledger, journal, etc',
    reference_id INT COMMENT 'Related record ID',
    receipt_number VARCHAR(50) COMMENT 'Auto-generated receipt number',
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50) DEFAULT 'cash' COMMENT 'cash, card, upi, cheque, bank_transfer',
    party_name VARCHAR(255) COMMENT 'Person associated with transaction',
    party_mobile VARCHAR(20),
    notes TEXT,
    running_balance DECIMAL(15, 2) DEFAULT 0.00,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    INDEX idx_daybook_temple (temple_id),
    INDEX idx_daybook_date (entry_date),
    INDEX idx_daybook_type (entry_type),
    INDEX idx_daybook_reference (reference_type, reference_id),
    INDEX idx_daybook_receipt (receipt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create daybook_logs table
CREATE TABLE IF NOT EXISTS daybook_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temple_id INT NOT NULL,
    daybook_entry_id INT NOT NULL,
    action VARCHAR(50) NOT NULL COMMENT 'created, updated, deleted',
    details JSON COMMENT 'Before/after snapshot of data',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    INDEX idx_daybook_logs_temple (temple_id),
    INDEX idx_daybook_logs_entry (daybook_entry_id),
    INDEX idx_daybook_logs_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
