BEGIN TRANSACTION;
BEGIN TRANSACTION;
CREATE TABLE `activity_logs` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `actor_user_id` integer not null, `action` varchar(255) not null, `target_table` varchar(255), `target_id` integer, `details` text, `created_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `annadhanam` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `receipt_number` varchar(255) not null, `name` varchar(255) not null, `mobile_number` varchar(255) not null, `food` text not null, `peoples` integer not null, `time` varchar(255) not null, `from_date` date not null, `to_date` date not null, `remarks` text, `created_by` integer, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`temple_id`) references `temples`(`id`) on delete CASCADE);
CREATE TABLE `donations` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `product_name` varchar(255) not null, `description` text, `price` float not null, `quantity` integer default '1', `category` varchar(255), `donor_name` varchar(255), `donor_contact` varchar(255), `donation_date` date, `status` text check (`status` in ('available', 'reserved', 'distributed')) default 'available', `notes` text, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
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
CREATE TABLE `ledger_entries` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `receipt_no` varchar(255) not null, `date` varchar(255), `donor_name` varchar(255) not null, `village` varchar(255), `mobile` varchar(255), `amount` float not null, `paid_amount` float default '0', `donation_amount` float default '0', `year` varchar(255), `status` varchar(255) default 'pending', `registration_id` integer, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `marriage_hall_bookings` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `register_no` varchar(255), `date` varchar(255), `time` varchar(255), `event` varchar(255), `subdivision` varchar(255), `name` varchar(255), `address` varchar(255), `village` varchar(255), `mobile` varchar(255), `advance_amount` varchar(255), `total_amount` varchar(255), `balance_amount` varchar(255), `remarks` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `marriage_registers` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `register_no` varchar(255), `date` varchar(255), `time` varchar(255), `event` varchar(255), `groom_name` varchar(255), `bride_name` varchar(255), `address` varchar(255), `village` varchar(255), `guardian_name` varchar(255), `witness_one` varchar(255), `witness_two` varchar(255), `remarks` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_clans` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_educations` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_groups` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_occupations` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_people` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `gender` varchar(255), `dob` varchar(255), `address` varchar(255), `village` varchar(255), `mobile` varchar(255), `email` varchar(255), `note` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_records` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `date` varchar(255) not null, `name` varchar(255) not null, `under` varchar(255) not null, `opening_balance` varchar(255) default '0', `balance_type` varchar(255) default 'credit', `address_line1` varchar(255) default '', `address_line2` varchar(255) default '', `address_line3` varchar(255) default '', `address_line4` varchar(255) default '', `village` varchar(255) default '', `telephone` varchar(255) default '', `mobile` varchar(255) default '', `email` varchar(255) default '', `note` varchar(255) default '', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE `master_villages` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `name` varchar(255) not null, `description` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);
INSERT INTO "permissions" VALUES('annadhanam_registrations','Annadhanam Registrations','Manage annadhanam registrations and food distribution');
INSERT INTO "permissions" VALUES('pooja_registrations','Pooja Registrations','Manage pooja registrations and religious ceremonies');
INSERT INTO "permissions" VALUES('pooja_approval','Pooja Approval','Approve or reject pooja requests from mobile users');
INSERT INTO "permissions" VALUES('pooja_mobile_submit','Pooja Mobile Submit','Submit pooja requests from mobile app');
INSERT INTO "permissions" VALUES(NULL,'view_kanikalar','View wedding details');
INSERT INTO "permissions" VALUES(NULL,'manage_kanikalar','Manage wedding details');
INSERT INTO "permissions" VALUES(NULL,'view_wedding_events','View wedding events');
INSERT INTO "permissions" VALUES(NULL,'manage_wedding_events','Manage wedding events');
INSERT INTO "permissions" VALUES('property_registrations','Property Registrations','Manage property registrations and tax details');
CREATE TABLE `pooja` (`id` integer not null primary key autoincrement, `temple_id` integer not null default '1', `receipt_number` varchar(255) not null, `name` varchar(255) not null, `mobile_number` varchar(255) not null, `time` varchar(255) not null, `from_date` date not null, `to_date` date not null, `remarks` text, `created_by` integer, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')), submitted_by_mobile TEXT, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, approved_at TIMESTAMP, rejection_reason TEXT, admin_notes TEXT, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`temple_id`) references `temples`(`id`) on delete CASCADE);
INSERT INTO "pooja" VALUES(1,1,'POO001','Rajesh Kumar','9876543210','06:00','2024-01-15','2024-01-15','Morning Ganapathy Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(2,1,'POO002','Priya Sharma','9876543211','18:00','2024-01-16','2024-01-16','Evening Lakshmi Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(3,1,'POO003','Suresh Reddy','9876543212','12:00','2024-01-17','2024-01-17','Noon Shiva Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(4,1,'POO004','Meera Patel','9876543213','08:00','2024-01-18','2024-01-20','3-day Navagraha Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(5,1,'POO005','Kumar Singh','9876543214','19:00','2024-01-19','2024-01-19','Evening Durga Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(6,1,'POO006','Anita Desai','9876543215','07:30','2024-01-20','2024-01-20','Morning Saraswati Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(7,1,'POO007','Vikram Joshi','9876543216','17:30','2024-01-21','2024-01-21','Evening Hanuman Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(8,1,'POO008','Sunita Agarwal','9876543217','11:00','2024-01-22','2024-01-22','Morning Venkateswara Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(9,1,'POO009','Ramesh Gupta','9876543218','20:00','2024-01-23','2024-01-23','Night Kali Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
INSERT INTO "pooja" VALUES(10,1,'POO010','Lakshmi Iyer','9876543219','09:00','2024-01-24','2024-01-26','3-day Maha Lakshmi Pooja',1,'2025-09-03 05:37:15','2025-09-03 05:37:15','approved',NULL,'2025-09-03 05:37:15',NULL,NULL,NULL,NULL);
CREATE TABLE `pooja_approval_logs` (`id` integer not null primary key autoincrement, `pooja_id` integer not null, `action` varchar(255) not null, `performed_by` integer, `performed_at` datetime default CURRENT_TIMESTAMP, `notes` text, `old_status` varchar(255), `new_status` varchar(255), foreign key(`pooja_id`) references `pooja`(`id`) on delete CASCADE, foreign key(`performed_by`) references `users`(`id`) on delete SET NULL);
CREATE TABLE `properties` (`id` integer not null primary key autoincrement, `property_no` varchar(255) not null, `survey_no` varchar(255) not null, `ward_no` varchar(255) not null, `street_name` varchar(255) not null, `area` varchar(255) not null, `city` varchar(255) not null, `pincode` varchar(255) not null, `owner_name` varchar(255) not null, `owner_mobile` varchar(255) not null, `owner_aadhaar` varchar(255), `owner_address` text, `tax_amount` float not null, `tax_year` integer not null, `tax_status` varchar(255) default 'pending', `last_paid_date` date, `pending_amount` float not null, `created_by` integer not null, `temple_id` integer not null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`temple_id`) references `temples`(`id`) on delete CASCADE, foreign key(`created_by`) references `users`(`id`) on delete SET NULL);
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  register_no TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  from_person TEXT NOT NULL,
  to_person TEXT NOT NULL,
  amount REAL NOT NULL,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit', 'full')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);
INSERT INTO "role_permissions" VALUES(1,'admin','annadhanam_registrations','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(2,'member','annadhanam_registrations','view','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(3,'superadmin','annadhanam_registrations','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(4,'admin','pooja_registrations','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(5,'member','pooja_registrations','view','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(6,'superadmin','pooja_registrations','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(7,'admin','pooja_approval','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(8,'superadmin','pooja_approval','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "role_permissions" VALUES(9,'member','pooja_mobile_submit','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
CREATE TABLE `session_logs` (`id` integer not null primary key autoincrement, `user_id` integer not null, `login_time` datetime default CURRENT_TIMESTAMP, `logout_time` datetime, `ip_address` varchar(255) not null, `user_agent` varchar(255), `duration_seconds` integer);
CREATE TABLE `tax_settings` (`id` integer not null primary key autoincrement, `temple_id` integer not null, `year` integer not null, `tax_amount` float not null, `description` varchar(255), `is_active` boolean default '1', `include_previous_years` boolean default '0', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
INSERT INTO "tax_settings" VALUES(1,1,2023,450.0,'Landowners Tax 2023',1,1,'2025-09-02 17:20:44','2025-09-02 17:20:44');
INSERT INTO "tax_settings" VALUES(2,1,2024,500.0,'Landowners Tax 2024',1,1,'2025-09-02 17:20:44','2025-09-02 17:20:44');
INSERT INTO "tax_settings" VALUES(3,1,2025,600.0,'Landowners Tax 2025',1,0,'2025-09-02 17:20:44','2025-09-02 17:20:44');
CREATE TABLE `temples` (`id` integer not null primary key autoincrement, `name` varchar(255) not null, `registration_id` varchar(255), `address` text, `phone` varchar(255), `email` varchar(255), `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP);
INSERT INTO "temples" VALUES(1,'Main Temple','TEMPLE001','Main Temple Address','+91-1234567890','temple@example.com','2025-09-02 09:44:00','2025-09-02 09:44:00');
CREATE TABLE `user_permissions` (`id` integer not null primary key autoincrement, `user_id` integer, `permission_id` varchar(255) not null, `access_level` text check (`access_level` in ('view', 'edit', 'full', 'none')) default 'none', `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE);
INSERT INTO "user_permissions" VALUES(1,1,'activity_logs','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(2,1,'backup_restore','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(3,1,'ledger_management','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(4,1,'master_data','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(5,1,'member_entry','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(6,1,'member_view','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(7,1,'reports','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(8,1,'session_logs','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(9,1,'temple_settings','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(10,1,'user_management','full','2025-09-03 05:28:04','2025-09-03 05:28:04');
INSERT INTO "user_permissions" VALUES(21,1,'pooja_registrations','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
INSERT INTO "user_permissions" VALUES(32,1,'pooja_mobile_submit','full','2025-09-03 05:37:15','2025-09-03 05:37:15');
CREATE TABLE `user_registrations` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `reference_number` varchar(255), `date` varchar(255), `subdivision` varchar(255), `name` varchar(255) not null, `username` varchar(255), `email` varchar(255), `alternative_name` varchar(255), `wife_name` varchar(255), `education` varchar(255), `occupation` varchar(255), `father_name` varchar(255), `address` varchar(255), `birth_date` varchar(255), `village` varchar(255), `mobile_number` varchar(255), `aadhaar_number` varchar(255), `pan_number` varchar(255), `clan` varchar(255), `group` varchar(255), `postal_code` varchar(255), `male_heirs` integer default '0', `female_heirs` integer default '0', `status` varchar(255) default 'active', `note` text, `is_approved` boolean default '0', `approved_by` integer, `approved_at` datetime, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`approved_by`) references `users`(`id`));
CREATE TABLE `user_tax_registrations` (`id` integer not null primary key autoincrement, `temple_id` integer default '1', `reference_number` varchar(255), `date` varchar(255), `subdivision` varchar(255), `name` varchar(255) not null, `alternative_name` varchar(255), `father_name` varchar(255), `address` varchar(255), `village` varchar(255), `mobile_number` varchar(255), `aadhaar_number` varchar(255), `clan` varchar(255), `group` varchar(255), `year` integer, `tax_amount` float default '0', `amount_paid` float default '0', `outstanding_amount` float default '0', `is_approved` boolean default '0', `approved_by` integer, `approved_at` datetime, `note` text, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`approved_by`) references `users`(`id`));
INSERT INTO "user_tax_registrations" VALUES(1,1,'TAX-2023-001','2023-03-15','subdivision1','Raman Kumar',NULL,'Krishnan Kumar','123 Temple Street, Village A',NULL,'9876543210','123456789012','Bharadwaja','Group A',2023,450.0,200.0,250.0,0,NULL,NULL,NULL,'2023-03-15 10:00:00','2023-03-15 10:00:00');
INSERT INTO "user_tax_registrations" VALUES(2,1,'TAX-2024-001','2024-04-10','subdivision2','Lakshmi Devi',NULL,'Venkat Rao','456 Main Road, Village B',NULL,'9876543211','123456789013','Kashyapa','Group B',2024,500.0,500.0,0.0,0,NULL,NULL,NULL,'2024-04-10 11:00:00','2024-04-10 11:00:00');
INSERT INTO "user_tax_registrations" VALUES(3,1,'TAX-2024-002','2024-05-20','subdivision3','Suresh Babu',NULL,'Raghavan Babu','789 East Street, Village C',NULL,'9876543212','123456789014','Vasishta','Group C',2024,500.0,0.0,500.0,0,NULL,NULL,NULL,'2024-05-20 12:00:00','2024-05-20 12:00:00');
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
, last_login TIMESTAMP);
INSERT INTO "users" VALUES(1,'superadmin','superadmin@temple.com','Super Administrator','9999999999','$2b$10$5diSmUYeCRVVn76KLcZ5z.QVREQnj85l519Shg1nOjlAnpWGZV5om','superadmin','active',1,'2025-09-03 05:37:15','2025-09-03 05:37:15',NULL);
INSERT INTO "users" VALUES(2,'testuser','test@example.com','Test User','1234567890','$2b$10$rgMhf7OKL6qwpC5WAv.CSONP1agcAePmnbmrFOAl8fc0ouRHeW2cC','admin','active',1,'2025-09-13 12:12:51','2025-09-13 12:12:51',NULL);
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
CREATE INDEX idx_receipts_date ON receipts(date);
CREATE INDEX `pooja_temple_id_index` on `pooja` (`temple_id`);
CREATE INDEX `pooja_receipt_number_index` on `pooja` (`receipt_number`);
CREATE INDEX `pooja_name_index` on `pooja` (`name`);
CREATE INDEX `pooja_mobile_number_index` on `pooja` (`mobile_number`);
CREATE INDEX `pooja_from_date_index` on `pooja` (`from_date`);
CREATE INDEX `pooja_to_date_index` on `pooja` (`to_date`);
CREATE INDEX `pooja_approval_logs_pooja_id_index` on `pooja_approval_logs` (`pooja_id`);
CREATE INDEX `pooja_approval_logs_action_index` on `pooja_approval_logs` (`action`);
CREATE INDEX `properties_temple_id_index` on `properties` (`temple_id`);
CREATE INDEX `properties_property_no_index` on `properties` (`property_no`);
CREATE INDEX `properties_owner_mobile_index` on `properties` (`owner_mobile`);
CREATE INDEX `properties_tax_status_index` on `properties` (`tax_status`);
CREATE UNIQUE INDEX `tax_settings_temple_id_year_unique` on `tax_settings` (`temple_id`, `year`);
CREATE UNIQUE INDEX `user_permissions_user_id_permission_id_unique` on `user_permissions` (`user_id`, `permission_id`);
CREATE INDEX `annadhanam_temple_id_index` on `annadhanam` (`temple_id`);
CREATE INDEX `annadhanam_receipt_number_index` on `annadhanam` (`receipt_number`);
CREATE INDEX `annadhanam_name_index` on `annadhanam` (`name`);
CREATE INDEX `annadhanam_mobile_number_index` on `annadhanam` (`mobile_number`);
CREATE INDEX `annadhanam_from_date_index` on `annadhanam` (`from_date`);
CREATE INDEX `annadhanam_to_date_index` on `annadhanam` (`to_date`);
CREATE INDEX idx_properties_temple ON properties(temple_id);
CREATE INDEX idx_properties_property_no ON properties(property_no);
CREATE INDEX idx_properties_owner_mobile ON properties(owner_mobile);
CREATE INDEX idx_properties_tax_status ON properties(tax_status);
CREATE INDEX idx_ledger_entries_date ON ledger_entries(date);
CREATE INDEX idx_ledger_accounts_date ON ledger_accounts(date);
CREATE INDEX idx_ledger_accounts_name ON ledger_accounts(name);
CREATE INDEX idx_ledger_accounts_under ON ledger_accounts(under);
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
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
DELETE FROM "sqlite_sequence";
COMMIT;
COMMIT;
