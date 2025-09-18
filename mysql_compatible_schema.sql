CREATE TABLE `temples` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `name` VARCHAR(255) not null, `registration_id` VARCHAR(255), address TEXT, phone TEXT, email TEXT);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE `master_records` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null, `date` VARCHAR(255) not null, `name` VARCHAR(255) not null, `under` VARCHAR(255) not null, `opening_balance` VARCHAR(255) default '0', `balance_type` VARCHAR(255) default 'credit', `address_line1` VARCHAR(255) default '', `address_line2` VARCHAR(255) default '', `address_line3` VARCHAR(255) default '', `address_line4` VARCHAR(255) default '', `village` VARCHAR(255) default '', `telephone` VARCHAR(255) default '', `mobile` VARCHAR(255) default '', `email` VARCHAR(255) default '', `note` VARCHAR(255) default '', `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, foreign key(`temple_id`) references `temples`(`id`));
CREATE TABLE `master_people` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null, `name` VARCHAR(255) not null, `gender` VARCHAR(255), `dob` VARCHAR(255), `address` VARCHAR(255), `village` VARCHAR(255), `mobile` VARCHAR(255), `email` VARCHAR(255), `note` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, foreign key(`temple_id`) references `temples`(`id`));
CREATE TABLE `user_permissions` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `user_id` integer, `permission_id` VARCHAR(255) not null, `access_level` TEXT check (`access_level` in ('full', 'view', 'none')) default 'none', `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE);
CREATE UNIQUE INDEX `user_permissions_user_id_permission_id_unique` on `user_permissions` (`user_id`, `permission_id`);
CREATE TABLE `master_groups` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `name` VARCHAR(255) not null, `description` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `master_clans` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `name` VARCHAR(255) not null, `description` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `master_occupations` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `name` VARCHAR(255) not null, `description` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `master_villages` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `name` VARCHAR(255) not null, `description` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `master_educations` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `name` VARCHAR(255) not null, `description` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `activity_logs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null, `actor_user_id` integer not null, `action` VARCHAR(255) not null, `target_table` VARCHAR(255), `target_id` integer, `details` TEXT, `created_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `superadmin_logs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `user_id` integer not null, `action` VARCHAR(255) not null, `ip_address` VARCHAR(255) not null, `user_agent` VARCHAR(255), `timestamp` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `session_logs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `user_id` integer not null, `login_time` DATETIME default CURRENT_TIMESTAMP, `logout_time` DATETIME, `ip_address` VARCHAR(255) not null, `user_agent` VARCHAR(255), `duration_seconds` integer);
CREATE TABLE IF NOT EXISTS "user_registrations" (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `reference_number` VARCHAR(255), `date` VARCHAR(255), `subdivision` VARCHAR(255), `name` VARCHAR(255) not null, `username` VARCHAR(255), `email` VARCHAR(255), `alternative_name` VARCHAR(255), `wife_name` VARCHAR(255), `education` VARCHAR(255), `occupation` VARCHAR(255), `father_name` VARCHAR(255), `address` VARCHAR(255), `birth_date` VARCHAR(255), `village` VARCHAR(255), `mobile_number` VARCHAR(255), `aadhaar_number` VARCHAR(255), `pan_number` VARCHAR(255), `clan` VARCHAR(255), `group` VARCHAR(255), `postal_code` VARCHAR(255), `male_heirs` integer default '0', `female_heirs` integer default '0', `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, photo_path TEXT);
CREATE TABLE `marriage_registers` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null default '1', `register_no` VARCHAR(255), `date` VARCHAR(255), `time` VARCHAR(255), `event` VARCHAR(255), `groom_name` VARCHAR(255), `bride_name` VARCHAR(255), `address` VARCHAR(255), `village` VARCHAR(255), `guardian_name` VARCHAR(255), `witness_one` VARCHAR(255), `witness_two` VARCHAR(255), `remarks` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, amount INTEGER DEFAULT 0);
CREATE TABLE `marriage_hall_bookings` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null default '1', `register_no` VARCHAR(255), `date` VARCHAR(255), `time` VARCHAR(255), `event` VARCHAR(255), `subdivision` VARCHAR(255), `name` VARCHAR(255), `address` VARCHAR(255), `village` VARCHAR(255), `mobile` VARCHAR(255), `advance_amount` VARCHAR(255), `total_amount` VARCHAR(255), `balance_amount` VARCHAR(255), `remarks` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')), submitted_by_mobile TEXT, approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, submitted_at TIMESTAMP, transfer_to_account TEXT, hall_id INTEGER, event_id INTEGER);
CREATE TABLE `user_tax_registrations` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `reference_number` VARCHAR(255), `date` VARCHAR(255), `subdivision` VARCHAR(255), `name` VARCHAR(255) not null, `alternative_name` VARCHAR(255), `wife_name` VARCHAR(255), `education` VARCHAR(255), `occupation` VARCHAR(255), `father_name` VARCHAR(255), `address` VARCHAR(255), `birth_date` VARCHAR(255), `village` VARCHAR(255), `mobile_number` VARCHAR(255), `aadhaar_number` VARCHAR(255), `pan_number` VARCHAR(255), `clan` VARCHAR(255), `group` VARCHAR(255), `postal_code` VARCHAR(255), `male_heirs` integer default '0', `female_heirs` integer default '0', `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, amount_paid DECIMAL(10,2) DEFAULT 0, outstanding_amount DECIMAL(10,2) DEFAULT 0, is_approved BOOLEAN DEFAULT 0, approved_by INTEGER REFERENCES users(id), approved_at TIMESTAMP, note TEXT, year INTEGER, tax_amount DECIMAL(10,2) DEFAULT 0, transfer_to_account TEXT, donation_amount DECIMAL(10,2) DEFAULT 0);
CREATE TABLE `tax_settings` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null, `year` integer not null, `tax_amount` FLOAT not null, `description` VARCHAR(255), `is_active` BOOLEAN default '1', `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, `include_previous_years` BOOLEAN default '0');
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
CREATE TABLE `knex_migrations` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `name` VARCHAR(255), `batch` integer, `migration_time` DATETIME);
CREATE TABLE `knex_migrations_lock` (`index` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `is_locked` integer);
CREATE TABLE `annadhanam` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null default '1', `receipt_number` VARCHAR(255) not null, `name` VARCHAR(255) not null, `mobile_number` VARCHAR(255) not null, `food` TEXT not null, `peoples` integer not null, `time` VARCHAR(255) not null, `from_date` date not null, `to_date` date not null, `remarks` TEXT, `created_by` integer, `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, status TEXT DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','cancelled')), submitted_by_mobile TEXT, submitted_at TIMESTAMP, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, approved_by INTEGER, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`temple_id`) references `temples`(`id`) on delete CASCADE);
CREATE INDEX `annadhanam_temple_id_index` on `annadhanam` (`temple_id`);
CREATE INDEX `annadhanam_receipt_number_index` on `annadhanam` (`receipt_number`);
CREATE INDEX `annadhanam_name_index` on `annadhanam` (`name`);
CREATE INDEX `annadhanam_mobile_number_index` on `annadhanam` (`mobile_number`);
CREATE INDEX `annadhanam_from_date_index` on `annadhanam` (`from_date`);
CREATE INDEX `annadhanam_to_date_index` on `annadhanam` (`to_date`);
CREATE TABLE `pooja` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null default '1', `receipt_number` VARCHAR(255) not null, `name` VARCHAR(255) not null, `mobile_number` VARCHAR(255) not null, `time` VARCHAR(255) not null, `from_date` date not null, `to_date` date not null, `remarks` TEXT, `created_by` integer, `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')), submitted_by_mobile TEXT, approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, submitted_at TIMESTAMP, transfer_to_account TEXT, amount REAL, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`temple_id`) references `temples`(`id`) on delete CASCADE);
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
CREATE TABLE `pooja_approval_logs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `pooja_id` integer not null, `action` VARCHAR(255) not null, `performed_by` integer, `performed_at` DATETIME default CURRENT_TIMESTAMP, `notes` TEXT, `old_status` VARCHAR(255), `new_status` VARCHAR(255), foreign key(`pooja_id`) references `pooja`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
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
CREATE TABLE `hall_approval_logs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `booking_id` integer not null, `action` VARCHAR(255) not null, `performed_by` integer, `performed_at` DATETIME default CURRENT_TIMESTAMP, `notes` TEXT, `old_status` VARCHAR(255), `new_status` VARCHAR(255), foreign key(`booking_id`) references `marriage_hall_bookings`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
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
CREATE TABLE `annadhanam_approval_logs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `annadhanam_id` integer not null, `action` VARCHAR(255) not null, `performed_by` integer, `performed_at` DATETIME default CURRENT_TIMESTAMP, `notes` TEXT, `old_status` VARCHAR(255), `new_status` VARCHAR(255), foreign key(`annadhanam_id`) references `annadhanam`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
CREATE INDEX `annadhanam_approval_logs_annadhanam_id_index` on `annadhanam_approval_logs` (`annadhanam_id`);
CREATE INDEX `annadhanam_approval_logs_action_index` on `annadhanam_approval_logs` (`action`);
CREATE TABLE `donations_approval_logs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `donation_id` integer not null, `action` VARCHAR(255) not null, `performed_by` integer, `performed_at` DATETIME default CURRENT_TIMESTAMP, `notes` TEXT, `old_status` VARCHAR(255), `new_status` VARCHAR(255), foreign key(`donation_id`) references `donations`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
CREATE INDEX `donations_approval_logs_donation_id_index` on `donations_approval_logs` (`donation_id`);
CREATE INDEX `donations_approval_logs_action_index` on `donations_approval_logs` (`action`);
CREATE TABLE `user_heirs` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `registration_id` integer not null, `serial_number` integer not null default '1', `name` VARCHAR(255) not null, `race` VARCHAR(255), `marital_status` VARCHAR(255), `education` VARCHAR(255), `birth_date` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, foreign key(`registration_id`) references `user_registrations`(`id`) on delete CASCADE);
CREATE TABLE `ledger_categories` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `value` VARCHAR(255) not null, `label` VARCHAR(255) not null, `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME);
CREATE UNIQUE INDEX `ledger_categories_value_unique` on `ledger_categories` (`value`);
CREATE UNIQUE INDEX `ledger_categories_label_unique` on `ledger_categories` (`label`);
CREATE TABLE `donation_products` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `value` VARCHAR(255) not null, `label` VARCHAR(255) not null, `unit` VARCHAR(255), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME);
CREATE UNIQUE INDEX `donation_products_value_unique` on `donation_products` (`value`);
CREATE UNIQUE INDEX `donation_products_label_unique` on `donation_products` (`label`);
CREATE TABLE `money_donations` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `register_no` VARCHAR(255), `date` VARCHAR(255) not null, `name` VARCHAR(255), `father_name` VARCHAR(255), `address` VARCHAR(255), `village` VARCHAR(255), `phone` VARCHAR(255), `amount` FLOAT not null, `reason` VARCHAR(255), `temple_id` integer not null, `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, transfer_to_account TEXT);
CREATE TABLE `pdf_settings` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer not null, `title_main` VARCHAR(255), `title_sub` VARCHAR(255), `title_line2` varchar(512), `subheader` VARCHAR(255), `logo_url` varchar(512), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP, `tax_subheader` VARCHAR(255), `annadhanam_subheader` VARCHAR(255), `hall_subheader` VARCHAR(255), `watermark_TEXT` VARCHAR(255), `annadhanam_receipt_label` VARCHAR(255), `annadhanam_date_label` VARCHAR(255), `annadhanam_year_label` VARCHAR(255), `annadhanam_cell_label` VARCHAR(255), `annadhanam_collector_label` VARCHAR(255));
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
CREATE TABLE `user_settings` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `user_id` integer not null, `landing_route` VARCHAR(255) default '/dashboard', `sidebar_collapsed_default` BOOLEAN not null default '0', `hidden_menu_keys` TEXT, `quick_actions` TEXT, `language` varchar(32), `theme` varchar(32), `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX `user_settings_user_id_unique` on `user_settings` (`user_id`);
CREATE TABLE `external_temple_databases` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `name` VARCHAR(255) not null, `db_path` VARCHAR(255) not null, `status` VARCHAR(255) not null default 'active', `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `system_settings` (`key` VARCHAR(255), `value` TEXT, `updated_at` DATETIME default CURRENT_TIMESTAMP, primary key (`key`));
CREATE TABLE `master_halls` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `name` VARCHAR(255) not null, `base_price` FLOAT null, `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
CREATE TABLE `master_hall_events` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, `temple_id` integer default '1', `name` VARCHAR(255) not null, `created_at` DATETIME default CURRENT_TIMESTAMP, `updated_at` DATETIME default CURRENT_TIMESTAMP);
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
