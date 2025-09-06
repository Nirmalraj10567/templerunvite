-- Add amount column to marriage_registers
-- Assumes SQLite; ADD COLUMN is supported and will set existing rows to default 0
ALTER TABLE marriage_registers ADD COLUMN amount INTEGER DEFAULT 0;
