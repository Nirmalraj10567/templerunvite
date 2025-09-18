CREATE TABLE `temples` (`id` integer not null primary key autoincrement, `name` varchar(255) not null, `registration_id` varchar(255), address TEXT, phone TEXT, email TEXT);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE `master_records` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `date` varchar(255) not null, `name` varchar(255) not null, `under` varchar(255) not null, `opening_balance` varchar(255) default '0', `balance_type` varchar(255) default 'credit', `address_line1` varchar(255) default '', `address_line2` varchar(255) default '', `address_line3` varchar(255) default '', `address_line4` varchar(255) default '', `village` varchar(255) default '', `telephone` varchar(255) default '', `mobile` varchar(255) default '', `email` varchar(255) default '', `note` varchar(255) default '', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`temple_id`) references `temples`(`id`));
CREATE TABLE `master_people` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `name` varchar(255) not null, `gender` varchar(255), `dob` varchar(255), `address` varchar(255), `village` varchar(255), `mobile` varchar(255), `email` varchar(255), `note` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`temple_id`) references `temples`(`id`));
CREATE TABLE `user_permissions` (`id` integer not null primary key autoincrement, `user_id` integer, `permission_id` varchar(255) not null, `access_level` text check (`access_level` in ('full', 'view', 'none')) default 'none', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE);
CREATE UNIQUE INDEX `user_permissions_user_id_permission_id_unique` on `user_permissions` (`user_id`, `permission_id`);
CREATE TABLE `master_groups` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_clans` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_occupations` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_villages` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_educations` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `activity_logs` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `actor_user_id` integer not null, `action` varchar(255) not null, `target_table` varchar(255), `target_id` integer, `details` text, `created_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `superadmin_logs` (`id` integer not null primary key autoincrement, `user_id` integer not null, `action` varchar(255) not null, `ip_address` varchar(255) not null, `user_agent` varchar(255), `timestamp` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `session_logs` (`id` integer not null primary key autoincrement, `user_id` integer not null, `login_time` datetime default CURRENT_TIMESTAMP, `logout_time` datetime, `ip_address` varchar(255) not null, `user_agent` varchar(255), `duration_seconds` integer);
CREATE TABLE IF NOT EXISTS "user_registrations" (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `reference_number` varchar(255), `date` varchar(255), `subdivision` varchar(255), `name` varchar(255) not null, `username` varchar(255), `email` varchar(255), `alternative_name` varchar(255), `wife_name` varchar(255), `education` varchar(255), `occupation` varchar(255), `father_name` varchar(255), `address` varchar(255), `birth_date` varchar(255), `village` varchar(255), `mobile_number` varchar(255), `aadhaar_number` varchar(255), `pan_number` varchar(255), `clan` varchar(255), `group` varchar(255), `postal_code` varchar(255), `male_heirs` integer default '0', `female_heirs` integer default '0', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, photo_path TEXT);
CREATE TABLE `marriage_registers` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `register_no` varchar(255), `date` varchar(255), `time` varchar(255), `event` varchar(255), `groom_name` varchar(255), `bride_name` varchar(255), `address` varchar(255), `village` varchar(255), `guardian_name` varchar(255), `witness_one` varchar(255), `witness_two` varchar(255), `remarks` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, amount INTEGER DEFAULT 0);
CREATE TABLE `marriage_hall_bookings` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `register_no` varchar(255), `date` varchar(255), `time` varchar(255), `event` varchar(255), `subdivision` varchar(255), `name` varchar(255), `address` varchar(255), `village` varchar(255), `mobile` varchar(255), `advance_amount` varchar(255), `total_amount` varchar(255), `balance_amount` varchar(255), `remarks` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')), submitted_by_mobile TEXT, approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, submitted_at TIMESTAMP, transfer_to_account TEXT, hall_id INTEGER, event_id INTEGER);
CREATE TABLE `user_tax_registrations` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `reference_number` varchar(255), `date` varchar(255), `subdivision` varchar(255), `name` varchar(255) not null, `alternative_name` varchar(255), `wife_name` varchar(255), `education` varchar(255), `occupation` varchar(255), `father_name` varchar(255), `address` varchar(255), `birth_date` varchar(255), `village` varchar(255), `mobile_number` varchar(255), `aadhaar_number` varchar(255), `pan_number` varchar(255), `clan` varchar(255), `group` varchar(255), `postal_code` varchar(255), `male_heirs` integer default '0', `female_heirs` integer default '0', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, amount_paid DECIMAL(10,2) DEFAULT 0, outstanding_amount DECIMAL(10,2) DEFAULT 0, is_approved BOOLEAN DEFAULT 0, approved_by INTEGER REFERENCES users(id), approved_at TIMESTAMP, note TEXT, year INTEGER, tax_amount DECIMAL(10,2) DEFAULT 0, transfer_to_account TEXT, donation_amount DECIMAL(10,2) DEFAULT 0);
CREATE TABLE `tax_settings` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `year` integer not null, `tax_amount` float not null, `description` varchar(255), `is_active` boolean default '1', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, `include_previous_years` boolean default '0');
CREATE UNIQUE INDEX `tax_settings_temple_id_year_unique` on `tax_settings` (`temple_id`, `year`);
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  access_level TEXT NOT NULL,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
CREATE TABLE properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    details TEXT NOT NULL,
    value TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    temple_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (temple_id) REFERENCES temples(id)
);
CREATE INDEX idx_properties_temple_id ON properties(temple_id);
CREATE INDEX idx_properties_created_by ON properties(created_by);
CREATE TABLE IF NOT EXISTS "donations" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temple_id INTEGER NOT NULL,
  product_name TEXT DEFAULT 'General Donation',
  description TEXT,
  price REAL DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  category TEXT DEFAULT 'General',
  donor_name TEXT DEFAULT 'Anonymous',
  donor_contact TEXT,
  donation_date TEXT DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'distributed')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
, approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending','approved','rejected','cancelled')), submitted_by_mobile TEXT, submitted_at TIMESTAMP, approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, transfer_to_account TEXT, register_no TEXT);
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  register_no TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL, -- 'receipt' or 'payment'
  from_person TEXT,
  to_person TEXT,
  amount REAL NOT NULL,
  remarks TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  temple_id INTEGER NOT NULL REFERENCES temples(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_receipts_temple_id ON receipts(temple_id);
CREATE INDEX idx_receipts_date ON receipts(date);
CREATE INDEX idx_receipts_register_no ON receipts(register_no);
CREATE TABLE `knex_migrations` (`id` integer not null primary key autoincrement, `name` varchar(255), `batch` integer, `migration_time` datetime);
CREATE TABLE `knex_migrations_lock` (`index` integer not null primary key autoincrement, `is_locked` integer);
CREATE TABLE `annadhanam` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `receipt_number` varchar(255) not null, `name` varchar(255) not null, `mobile_number` varchar(255) not null, `food` text not null, `peoples` integer not null, `time` varchar(255) not null, `from_date` date not null, `to_date` date not null, `remarks` text, `created_by` integer, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, status TEXT DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','cancelled')), submitted_by_mobile TEXT, submitted_at TIMESTAMP, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, approved_by INTEGER, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`temple_id`) references `temples`(`id`) on delete CASCADE);
CREATE INDEX `annadhanam_temple_id_index` on `annadhanam` (`temple_id`);
CREATE INDEX `annadhanam_receipt_number_index` on `annadhanam` (`receipt_number`);
CREATE INDEX `annadhanam_name_index` on `annadhanam` (`name`);
CREATE INDEX `annadhanam_mobile_number_index` on `annadhanam` (`mobile_number`);
CREATE INDEX `annadhanam_from_date_index` on `annadhanam` (`from_date`);
CREATE INDEX `annadhanam_to_date_index` on `annadhanam` (`to_date`);
CREATE TABLE `pooja` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `receipt_number` varchar(255) not null, `name` varchar(255) not null, `mobile_number` varchar(255) not null, `time` varchar(255) not null, `from_date` date not null, `to_date` date not null, `remarks` text, `created_by` integer, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')), submitted_by_mobile TEXT, approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, submitted_at TIMESTAMP, transfer_to_account TEXT, amount REAL, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`temple_id`) references `temples`(`id`) on delete CASCADE);
CREATE INDEX `pooja_temple_id_index` on `pooja` (`temple_id`);
CREATE INDEX `pooja_receipt_number_index` on `pooja` (`receipt_number`);
CREATE INDEX `pooja_name_index` on `pooja` (`name`);
CREATE INDEX `pooja_mobile_number_index` on `pooja` (`mobile_number`);
CREATE INDEX `pooja_from_date_index` on `pooja` (`from_date`);
CREATE INDEX `pooja_to_date_index` on `pooja` (`to_date`);
CREATE INDEX idx_annadhanam_temple ON annadhanam(temple_id);
CREATE INDEX idx_annadhanam_receipt_number ON annadhanam(receipt_number);
CREATE INDEX idx_annadhanam_name ON annadhanam(name);
CREATE INDEX idx_annadhanam_mobile ON annadhanam(mobile_number);
CREATE INDEX idx_annadhanam_from_date ON annadhanam(from_date);
CREATE INDEX idx_annadhanam_to_date ON annadhanam(to_date);
CREATE INDEX idx_pooja_temple ON pooja(temple_id);
CREATE INDEX idx_pooja_receipt_number ON pooja(receipt_number);
CREATE INDEX idx_pooja_name ON pooja(name);
CREATE INDEX idx_pooja_mobile ON pooja(mobile_number);
CREATE INDEX idx_pooja_from_date ON pooja(from_date);
CREATE INDEX idx_pooja_to_date ON pooja(to_date);
CREATE TABLE `pooja_approval_logs` (`id` integer not null primary key autoincrement, `pooja_id` integer not null, `action` varchar(255) not null, `performed_by` integer, `performed_at` datetime default CURRENT_TIMESTAMP, `notes` text, `old_status` varchar(255), `new_status` varchar(255), foreign key(`pooja_id`) references `pooja`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
CREATE INDEX `pooja_approval_logs_pooja_id_index` on `pooja_approval_logs` (`pooja_id`);
CREATE INDEX `pooja_approval_logs_action_index` on `pooja_approval_logs` (`action`);
CREATE TABLE tax_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT CHECK(status IN ('pending', 'partial', 'paid')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES user_registrations(id)
);
CREATE TABLE pooja_payments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  year INTEGER,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ledger_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    under TEXT,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    address TEXT,
    city TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    note TEXT,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ledger_accounts_date ON ledger_accounts(date);
CREATE INDEX idx_ledger_accounts_name ON ledger_accounts(name);
CREATE INDEX idx_ledger_accounts_under ON ledger_accounts(under);
CREATE TABLE kanikalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bride_name TEXT NOT NULL,
    groom_name TEXT NOT NULL,
    wedding_date TEXT NOT NULL,
    venue TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    temple_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE wedding_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kanikalar_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kanikalar_id) REFERENCES kanikalar(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_properties_temple ON properties(temple_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE TABLE IF NOT EXISTS "ledger_entries" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            name TEXT NOT NULL,
            under TEXT,
            type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
            amount DECIMAL(10, 2) NOT NULL,
            address TEXT,
            city TEXT,
            phone TEXT,
            mobile TEXT,
            email TEXT,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        , registration_id INTEGER);
CREATE INDEX idx_ledger_entries_date ON ledger_entries(date);
CREATE INDEX idx_ledger_entries_name ON ledger_entries(name);
CREATE INDEX idx_ledger_entries_under ON ledger_entries(under);
CREATE VIEW profit_and_loss AS
SELECT 
    strftime('%Y-%m', date) as month,
    SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_expenses,
    (SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) - 
     SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END)) as net_profit_loss
FROM 
    ledger_entries
GROUP BY 
    strftime('%Y-%m', date)
ORDER BY 
    month DESC
/* profit_and_loss(month,total_income,total_expenses,net_profit_loss) */;
CREATE TABLE `hall_approval_logs` (`id` integer not null primary key autoincrement, `booking_id` integer not null, `action` varchar(255) not null, `performed_by` integer, `performed_at` datetime default CURRENT_TIMESTAMP, `notes` text, `old_status` varchar(255), `new_status` varchar(255), foreign key(`booking_id`) references `marriage_hall_bookings`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
CREATE INDEX `hall_approval_logs_booking_id_index` on `hall_approval_logs` (`booking_id`);
CREATE INDEX `hall_approval_logs_action_index` on `hall_approval_logs` (`action`);
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    temple_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE event_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE `annadhanam_approval_logs` (`id` integer not null primary key autoincrement, `annadhanam_id` integer not null, `action` varchar(255) not null, `performed_by` integer, `performed_at` datetime default CURRENT_TIMESTAMP, `notes` text, `old_status` varchar(255), `new_status` varchar(255), foreign key(`annadhanam_id`) references `annadhanam`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
CREATE INDEX `annadhanam_approval_logs_annadhanam_id_index` on `annadhanam_approval_logs` (`annadhanam_id`);
CREATE INDEX `annadhanam_approval_logs_action_index` on `annadhanam_approval_logs` (`action`);
CREATE TABLE `donations_approval_logs` (`id` integer not null primary key autoincrement, `donation_id` integer not null, `action` varchar(255) not null, `performed_by` integer, `performed_at` datetime default CURRENT_TIMESTAMP, `notes` text, `old_status` varchar(255), `new_status` varchar(255), foreign key(`donation_id`) references `donations`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
CREATE INDEX `donations_approval_logs_donation_id_index` on `donations_approval_logs` (`donation_id`);
CREATE INDEX `donations_approval_logs_action_index` on `donations_approval_logs` (`action`);
CREATE TABLE `user_heirs` (`id` integer not null primary key autoincrement, `registration_id` integer not null, `serial_number` integer not null default '1', `name` varchar(255) not null, `race` varchar(255), `marital_status` varchar(255), `education` varchar(255), `birth_date` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`registration_id`) references `user_registrations`(`id`) on delete CASCADE);
CREATE TABLE `ledger_categories` (`id` integer not null primary key autoincrement, `value` varchar(255) not null, `label` varchar(255) not null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime);
CREATE UNIQUE INDEX `ledger_categories_value_unique` on `ledger_categories` (`value`);
CREATE UNIQUE INDEX `ledger_categories_label_unique` on `ledger_categories` (`label`);
CREATE TABLE `donation_products` (`id` integer not null primary key autoincrement, `value` varchar(255) not null, `label` varchar(255) not null, `unit` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime);
CREATE UNIQUE INDEX `donation_products_value_unique` on `donation_products` (`value`);
CREATE UNIQUE INDEX `donation_products_label_unique` on `donation_products` (`label`);
CREATE TABLE `money_donations` (`id` integer not null primary key autoincrement, `register_no` varchar(255), `date` varchar(255) not null, `name` varchar(255), `father_name` varchar(255), `address` varchar(255), `village` varchar(255), `phone` varchar(255), `amount` float not null, `reason` varchar(255), `temple_id` integer not null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, transfer_to_account TEXT);
CREATE TABLE `pdf_settings` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `title_main` varchar(255), `title_sub` varchar(255), `title_line2` varchar(512), `subheader` varchar(255), `logo_url` varchar(512), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, `tax_subheader` varchar(255), `annadhanam_subheader` varchar(255), `hall_subheader` varchar(255), `watermark_text` varchar(255), `annadhanam_receipt_label` varchar(255), `annadhanam_date_label` varchar(255), `annadhanam_year_label` varchar(255), `annadhanam_cell_label` varchar(255), `annadhanam_collector_label` varchar(255));
CREATE UNIQUE INDEX `pdf_settings_temple_id_unique` on `pdf_settings` (`temple_id`);
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    from_account TEXT NOT NULL,
    to_account TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('transfer','receipt','payment','donation','adjustment')),
    reference_type TEXT,
    reference_id INTEGER,
    remarks TEXT,
    temple_id INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_journal_date ON journal_entries(date);
CREATE INDEX idx_journal_from ON journal_entries(from_account);
CREATE INDEX idx_journal_to ON journal_entries(to_account);
CREATE INDEX idx_journal_temple ON journal_entries(temple_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(date);
CREATE INDEX idx_journal_entries_from ON journal_entries(from_account);
CREATE INDEX idx_journal_entries_to ON journal_entries(to_account);
CREATE INDEX idx_journal_entries_temple ON journal_entries(temple_id);
CREATE TABLE `user_settings` (`id` integer not null primary key autoincrement, `user_id` integer not null, `landing_route` varchar(255) default '/dashboard', `sidebar_collapsed_default` boolean not null default '0', `hidden_menu_keys` text, `quick_actions` text, `language` varchar(32), `theme` varchar(32), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX `user_settings_user_id_unique` on `user_settings` (`user_id`);
CREATE TABLE `external_temple_databases` (`id` integer not null primary key autoincrement, `name` varchar(255) not null, `db_path` varchar(255) not null, `status` varchar(255) not null default 'active', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `system_settings` (`key` varchar(255), `value` text, `updated_at` datetime default CURRENT_TIMESTAMP, primary key (`key`));
CREATE TABLE `master_halls` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `base_price` float null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_hall_events` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  mobile TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  temple_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
