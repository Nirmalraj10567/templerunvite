-- Create a table to track receipt numbers
CREATE TABLE receipt_counter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  UNIQUE(year)
);

-- Insert initial counter for current year
INSERT INTO receipt_counter (year, last_number) 
VALUES (2025, 8); -- Starting from 8 as per your example '2025-0008'
