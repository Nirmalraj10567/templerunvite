CREATE TABLE ledger_categories (
  id SERIAL PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  temple_id INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(value, temple_id),
  UNIQUE(label, temple_id)
);

CREATE INDEX idx_ledger_categories_value ON ledger_categories(value);
CREATE INDEX idx_ledger_categories_temple_id ON ledger_categories(temple_id);
