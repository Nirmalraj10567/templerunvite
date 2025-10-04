-- Migration: Add member_id column to user_tax_registrations table (MySQL)
-- Date: 2025-01-10

-- Add member_id column to user_tax_registrations table
ALTER TABLE user_tax_registrations ADD COLUMN member_id VARCHAR(255) NULL;

-- Add index for better search performance
CREATE INDEX idx_user_tax_registrations_member_id ON user_tax_registrations(member_id);

-- Update existing records to have NULL member_id (they will be populated when edited)
-- No need to update existing records as they will remain NULL until manually updated
