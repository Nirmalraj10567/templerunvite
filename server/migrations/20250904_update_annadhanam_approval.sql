-- Update annadhanam table to support approval workflow
-- Adds columns expected by routes in server/annadhanam-approval.js

ALTER TABLE annadhanam ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE annadhanam ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE annadhanam ADD COLUMN approved_at TIMESTAMP NULL;
ALTER TABLE annadhanam ADD COLUMN rejection_reason TEXT NULL;
ALTER TABLE annadhanam ADD COLUMN admin_notes TEXT NULL;
ALTER TABLE annadhanam ADD COLUMN submitted_by_mobile TEXT NULL;
ALTER TABLE annadhanam ADD COLUMN submitted_at TIMESTAMP NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_annadhanam_status ON annadhanam(status);
CREATE INDEX IF NOT EXISTS idx_annadhanam_submitted_at ON annadhanam(submitted_at);
CREATE INDEX IF NOT EXISTS idx_annadhanam_approved_at ON annadhanam(approved_at);

-- Approval logs table to audit actions
CREATE TABLE IF NOT EXISTS annadhanam_approval_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annadhanam_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- approved | rejected | etc
  performed_by INTEGER NOT NULL,
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  old_status TEXT,
  new_status TEXT,
  FOREIGN KEY (annadhanam_id) REFERENCES annadhanam(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_annad_approval_logs_annadhanam_id ON annadhanam_approval_logs(annadhanam_id);
CREATE INDEX IF NOT EXISTS idx_annad_approval_logs_performed_at ON annadhanam_approval_logs(performed_at);
