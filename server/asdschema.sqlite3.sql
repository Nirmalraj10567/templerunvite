BEGIN TRANSACTION;
DROP TABLE IF EXISTS "activity_logs";
CREATE TABLE "activity_logs" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL,
	"actor_user_id"	integer NOT NULL,
	"action"	varchar(255) NOT NULL,
	"target_table"	varchar(255),
	"target_id"	integer,
	"details"	text,
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "annadhanam";
CREATE TABLE "annadhanam" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL DEFAULT '1',
	"receipt_number"	varchar(255) NOT NULL,
	"name"	varchar(255) NOT NULL,
	"mobile_number"	varchar(255) NOT NULL,
	"food"	text NOT NULL,
	"peoples"	integer NOT NULL,
	"time"	varchar(255) NOT NULL,
	"from_date"	date NOT NULL,
	"to_date"	date NOT NULL,
	"remarks"	text,
	"created_by"	integer,
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"status"	TEXT DEFAULT 'approved' CHECK("status" IN ('pending', 'approved', 'rejected', 'cancelled')),
	"submitted_by_mobile"	TEXT,
	"submitted_at"	TIMESTAMP,
	"approved_at"	TIMESTAMP,
	"rejection_reason"	TEXT,
	"admin_notes"	TEXT,
	"approved_by"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("created_by") REFERENCES "users"("id") on delete SET NULL,
	FOREIGN KEY("temple_id") REFERENCES "temples"("id") on delete CASCADE
);
DROP TABLE IF EXISTS "annadhanam_approval_logs";
CREATE TABLE "annadhanam_approval_logs" (
	"id"	integer NOT NULL,
	"annadhanam_id"	integer NOT NULL,
	"action"	varchar(255) NOT NULL,
	"performed_by"	integer,
	"performed_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"notes"	text,
	"old_status"	varchar(255),
	"new_status"	varchar(255),
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("annadhanam_id") REFERENCES "annadhanam"("id") on delete CASCADE,
	FOREIGN KEY("performed_by") REFERENCES "users"("id") on delete SET NULL
);
DROP TABLE IF EXISTS "donation_products";
CREATE TABLE "donation_products" (
	"id"	integer NOT NULL,
	"value"	varchar(255) NOT NULL,
	"label"	varchar(255) NOT NULL,
	"unit"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "donations";
CREATE TABLE "donations" (
	"id"	INTEGER,
	"temple_id"	INTEGER NOT NULL,
	"product_name"	TEXT DEFAULT 'General Donation',
	"description"	TEXT,
	"price"	REAL DEFAULT 0,
	"quantity"	INTEGER DEFAULT 1,
	"category"	TEXT DEFAULT 'General',
	"donor_name"	TEXT DEFAULT 'Anonymous',
	"donor_contact"	TEXT,
	"donation_date"	TEXT DEFAULT CURRENT_DATE,
	"status"	TEXT DEFAULT 'available' CHECK("status" IN ('available', 'reserved', 'distributed')),
	"notes"	TEXT,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"approval_status"	TEXT DEFAULT 'approved' CHECK("approval_status" IN ('pending', 'approved', 'rejected', 'cancelled')),
	"submitted_by_mobile"	TEXT,
	"submitted_at"	TIMESTAMP,
	"approved_by"	INTEGER,
	"approved_at"	TIMESTAMP,
	"rejection_reason"	TEXT,
	"admin_notes"	TEXT,
	"transfer_to_account"	TEXT,
	"register_no"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
);
DROP TABLE IF EXISTS "donations_approval_logs";
CREATE TABLE "donations_approval_logs" (
	"id"	integer NOT NULL,
	"donation_id"	integer NOT NULL,
	"action"	varchar(255) NOT NULL,
	"performed_by"	integer,
	"performed_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"notes"	text,
	"old_status"	varchar(255),
	"new_status"	varchar(255),
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("donation_id") REFERENCES "donations"("id") on delete CASCADE,
	FOREIGN KEY("performed_by") REFERENCES "users"("id") on delete SET NULL
);
DROP TABLE IF EXISTS "event_images";
CREATE TABLE "event_images" (
	"id"	INTEGER,
	"event_id"	INTEGER NOT NULL,
	"image_path"	TEXT NOT NULL,
	"uploaded_by"	INTEGER NOT NULL,
	"uploaded_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"title"	TEXT,
	"caption"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("event_id") REFERENCES "events"("id") ON DELETE CASCADE,
	FOREIGN KEY("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL
);
DROP TABLE IF EXISTS "events";
CREATE TABLE "events" (
	"id"	INTEGER,
	"title"	TEXT NOT NULL,
	"description"	TEXT,
	"date"	TEXT NOT NULL,
	"time"	TEXT NOT NULL,
	"location"	TEXT NOT NULL,
	"temple_id"	INTEGER NOT NULL,
	"created_by"	INTEGER NOT NULL,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
	FOREIGN KEY("temple_id") REFERENCES "temples"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "external_temple_databases";
CREATE TABLE "external_temple_databases" (
	"id"	integer NOT NULL,
	"name"	varchar(255) NOT NULL,
	"db_path"	varchar(255) NOT NULL,
	"status"	varchar(255) NOT NULL DEFAULT 'active',
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "hall_approval_logs";
CREATE TABLE "hall_approval_logs" (
	"id"	integer NOT NULL,
	"booking_id"	integer NOT NULL,
	"action"	varchar(255) NOT NULL,
	"performed_by"	integer,
	"performed_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"notes"	text,
	"old_status"	varchar(255),
	"new_status"	varchar(255),
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("booking_id") REFERENCES "marriage_hall_bookings"("id") on delete CASCADE,
	FOREIGN KEY("performed_by") REFERENCES "users"("id") on delete SET NULL
);
DROP TABLE IF EXISTS "journal_entries";
CREATE TABLE "journal_entries" (
	"id"	INTEGER,
	"date"	TEXT NOT NULL,
	"from_account"	TEXT NOT NULL,
	"to_account"	TEXT NOT NULL,
	"amount"	REAL NOT NULL CHECK("amount" > 0),
	"entry_type"	TEXT NOT NULL CHECK("entry_type" IN ('transfer', 'receipt', 'payment', 'donation', 'adjustment')),
	"reference_type"	TEXT,
	"reference_id"	INTEGER,
	"remarks"	TEXT,
	"temple_id"	INTEGER,
	"created_by"	INTEGER,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "kanikalar";
CREATE TABLE "kanikalar" (
	"id"	INTEGER,
	"bride_name"	TEXT NOT NULL,
	"groom_name"	TEXT NOT NULL,
	"wedding_date"	TEXT NOT NULL,
	"venue"	TEXT NOT NULL,
	"contact_number"	TEXT,
	"email"	TEXT,
	"temple_id"	INTEGER NOT NULL,
	"created_by"	INTEGER NOT NULL,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
	FOREIGN KEY("temple_id") REFERENCES "temples"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "knex_migrations";
CREATE TABLE "knex_migrations" (
	"id"	integer NOT NULL,
	"name"	varchar(255),
	"batch"	integer,
	"migration_time"	datetime,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "knex_migrations_lock";
CREATE TABLE "knex_migrations_lock" (
	"index"	integer NOT NULL,
	"is_locked"	integer,
	PRIMARY KEY("index" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "ledger_accounts";
CREATE TABLE "ledger_accounts" (
	"id"	INTEGER,
	"date"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"under"	TEXT,
	"current_balance"	DECIMAL(10, 2) DEFAULT 0,
	"address"	TEXT,
	"city"	TEXT,
	"phone"	TEXT,
	"mobile"	TEXT,
	"email"	TEXT,
	"note"	TEXT,
	"type"	TEXT NOT NULL CHECK("type" IN ('credit', 'debit')),
	"amount"	DECIMAL(10, 2) NOT NULL,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "ledger_categories";
CREATE TABLE "ledger_categories" (
	"id"	integer NOT NULL,
	"value"	varchar(255) NOT NULL,
	"label"	varchar(255) NOT NULL,
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "ledger_entries";
CREATE TABLE "ledger_entries" (
	"id"	INTEGER,
	"date"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"under"	TEXT,
	"type"	TEXT NOT NULL CHECK("type" IN ('credit', 'debit')),
	"amount"	DECIMAL(10, 2) NOT NULL,
	"address"	TEXT,
	"city"	TEXT,
	"phone"	TEXT,
	"mobile"	TEXT,
	"email"	TEXT,
	"note"	TEXT,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"registration_id"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "marriage_hall_bookings";
CREATE TABLE "marriage_hall_bookings" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL DEFAULT '1',
	"register_no"	varchar(255),
	"date"	varchar(255),
	"time"	varchar(255),
	"event"	varchar(255),
	"subdivision"	varchar(255),
	"name"	varchar(255),
	"address"	varchar(255),
	"village"	varchar(255),
	"mobile"	varchar(255),
	"advance_amount"	varchar(255),
	"total_amount"	varchar(255),
	"balance_amount"	varchar(255),
	"remarks"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"status"	TEXT DEFAULT 'approved' CHECK("status" IN ('pending', 'approved', 'rejected', 'cancelled')),
	"submitted_by_mobile"	TEXT,
	"approved_by"	INTEGER,
	"approved_at"	TIMESTAMP,
	"rejection_reason"	TEXT,
	"admin_notes"	TEXT,
	"submitted_at"	TIMESTAMP,
	"transfer_to_account"	TEXT,
	"hall_id"	INTEGER,
	"event_id"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
);
DROP TABLE IF EXISTS "marriage_registers";
CREATE TABLE "marriage_registers" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL DEFAULT '1',
	"register_no"	varchar(255),
	"date"	varchar(255),
	"time"	varchar(255),
	"event"	varchar(255),
	"groom_name"	varchar(255),
	"bride_name"	varchar(255),
	"address"	varchar(255),
	"village"	varchar(255),
	"guardian_name"	varchar(255),
	"witness_one"	varchar(255),
	"witness_two"	varchar(255),
	"remarks"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"amount"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "master_clans";
CREATE TABLE "master_clans" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"description"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "master_educations";
CREATE TABLE "master_educations" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"description"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "master_groups";
CREATE TABLE "master_groups" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"description"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "master_hall_events";
CREATE TABLE "master_hall_events" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "master_halls";
CREATE TABLE "master_halls" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"base_price"	float,
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "master_occupations";
CREATE TABLE "master_occupations" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"description"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "master_people";
CREATE TABLE "master_people" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL,
	"name"	varchar(255) NOT NULL,
	"gender"	varchar(255),
	"dob"	varchar(255),
	"address"	varchar(255),
	"village"	varchar(255),
	"mobile"	varchar(255),
	"email"	varchar(255),
	"note"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("temple_id") REFERENCES "temples"("id")
);
DROP TABLE IF EXISTS "master_records";
CREATE TABLE "master_records" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL,
	"date"	varchar(255) NOT NULL,
	"name"	varchar(255) NOT NULL,
	"under"	varchar(255) NOT NULL,
	"opening_balance"	varchar(255) DEFAULT '0',
	"balance_type"	varchar(255) DEFAULT 'credit',
	"address_line1"	varchar(255) DEFAULT '',
	"address_line2"	varchar(255) DEFAULT '',
	"address_line3"	varchar(255) DEFAULT '',
	"address_line4"	varchar(255) DEFAULT '',
	"village"	varchar(255) DEFAULT '',
	"telephone"	varchar(255) DEFAULT '',
	"mobile"	varchar(255) DEFAULT '',
	"email"	varchar(255) DEFAULT '',
	"note"	varchar(255) DEFAULT '',
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("temple_id") REFERENCES "temples"("id")
);
DROP TABLE IF EXISTS "master_villages";
CREATE TABLE "master_villages" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"description"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "money_donations";
CREATE TABLE "money_donations" (
	"id"	integer NOT NULL,
	"register_no"	varchar(255),
	"date"	varchar(255) NOT NULL,
	"name"	varchar(255),
	"father_name"	varchar(255),
	"address"	varchar(255),
	"village"	varchar(255),
	"phone"	varchar(255),
	"amount"	float NOT NULL,
	"reason"	varchar(255),
	"temple_id"	integer NOT NULL,
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"transfer_to_account"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "pdf_settings";
CREATE TABLE "pdf_settings" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL,
	"title_main"	varchar(255),
	"title_sub"	varchar(255),
	"title_line2"	varchar(512),
	"subheader"	varchar(255),
	"logo_url"	varchar(512),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"tax_subheader"	varchar(255),
	"annadhanam_subheader"	varchar(255),
	"hall_subheader"	varchar(255),
	"watermark_text"	varchar(255),
	"annadhanam_receipt_label"	varchar(255),
	"annadhanam_date_label"	varchar(255),
	"annadhanam_year_label"	varchar(255),
	"annadhanam_cell_label"	varchar(255),
	"annadhanam_collector_label"	varchar(255),
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "permissions";
CREATE TABLE "permissions" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "pooja";
CREATE TABLE "pooja" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL DEFAULT '1',
	"receipt_number"	varchar(255) NOT NULL,
	"name"	varchar(255) NOT NULL,
	"mobile_number"	varchar(255) NOT NULL,
	"time"	varchar(255) NOT NULL,
	"from_date"	date NOT NULL,
	"to_date"	date NOT NULL,
	"remarks"	text,
	"created_by"	integer,
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"status"	TEXT DEFAULT 'approved' CHECK("status" IN ('pending', 'approved', 'rejected', 'cancelled')),
	"submitted_by_mobile"	TEXT,
	"approved_by"	INTEGER,
	"approved_at"	TIMESTAMP,
	"rejection_reason"	TEXT,
	"admin_notes"	TEXT,
	"submitted_at"	TIMESTAMP,
	"transfer_to_account"	TEXT,
	"amount"	REAL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("approved_by") REFERENCES "users"("id") ON DELETE SET NULL,
	FOREIGN KEY("created_by") REFERENCES "users"("id") on delete SET NULL,
	FOREIGN KEY("temple_id") REFERENCES "temples"("id") on delete CASCADE
);
DROP TABLE IF EXISTS "pooja_approval_logs";
CREATE TABLE "pooja_approval_logs" (
	"id"	integer NOT NULL,
	"pooja_id"	integer NOT NULL,
	"action"	varchar(255) NOT NULL,
	"performed_by"	integer,
	"performed_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"notes"	text,
	"old_status"	varchar(255),
	"new_status"	varchar(255),
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("performed_by") REFERENCES "users"("id") on delete SET NULL,
	FOREIGN KEY("pooja_id") REFERENCES "pooja"("id") on delete CASCADE
);
DROP TABLE IF EXISTS "pooja_payments";
CREATE TABLE "pooja_payments" (
	"id"	INTEGER,
	"user_id"	INTEGER,
	"year"	INTEGER,
	"total_amount"	REAL DEFAULT 0,
	"paid_amount"	REAL DEFAULT 0,
	"status"	TEXT DEFAULT 'pending',
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "properties";
CREATE TABLE "properties" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL,
	"details"	TEXT NOT NULL,
	"value"	TEXT NOT NULL,
	"created_by"	INTEGER NOT NULL,
	"temple_id"	INTEGER NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("created_by") REFERENCES "users"("id"),
	FOREIGN KEY("temple_id") REFERENCES "temples"("id")
);
DROP TABLE IF EXISTS "receipt_counter";
CREATE TABLE "receipt_counter" (
	"id"	INTEGER,
	"year"	INTEGER NOT NULL,
	"last_number"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("year")
);
DROP TABLE IF EXISTS "receipts";
CREATE TABLE "receipts" (
	"id"	INTEGER,
	"register_no"	TEXT NOT NULL,
	"date"	TEXT NOT NULL,
	"type"	TEXT NOT NULL,
	"from_person"	TEXT,
	"to_person"	TEXT,
	"amount"	REAL NOT NULL,
	"remarks"	TEXT,
	"created_by"	INTEGER NOT NULL,
	"temple_id"	INTEGER NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("created_by") REFERENCES "users"("id"),
	FOREIGN KEY("temple_id") REFERENCES "temples"("id")
);
DROP TABLE IF EXISTS "role_permissions";
CREATE TABLE "role_permissions" (
	"id"	INTEGER,
	"role_id"	TEXT NOT NULL,
	"permission_id"	TEXT NOT NULL,
	"access_level"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "sample_table";
CREATE TABLE "sample_table" (
	"id"	integer NOT NULL,
	"name"	varchar(255) NOT NULL,
	"description"	text,
	"created_at"	datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "session_logs";
CREATE TABLE "session_logs" (
	"id"	integer NOT NULL,
	"user_id"	integer NOT NULL,
	"login_time"	datetime DEFAULT CURRENT_TIMESTAMP,
	"logout_time"	datetime,
	"ip_address"	varchar(255) NOT NULL,
	"user_agent"	varchar(255),
	"duration_seconds"	integer,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "superadmin_logs";
CREATE TABLE "superadmin_logs" (
	"id"	integer NOT NULL,
	"user_id"	integer NOT NULL,
	"action"	varchar(255) NOT NULL,
	"ip_address"	varchar(255) NOT NULL,
	"user_agent"	varchar(255),
	"timestamp"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "system_settings";
CREATE TABLE "system_settings" (
	"key"	varchar(255),
	"value"	text,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("key")
);
DROP TABLE IF EXISTS "tax_payments";
CREATE TABLE "tax_payments" (
	"id"	INTEGER,
	"user_id"	INTEGER NOT NULL,
	"year"	INTEGER NOT NULL,
	"amount"	DECIMAL(10, 2) NOT NULL,
	"paid_amount"	DECIMAL(10, 2) DEFAULT 0,
	"status"	TEXT DEFAULT 'pending' CHECK("status" IN ('pending', 'partial', 'paid')),
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("user_id") REFERENCES "user_registrations"("id")
);
DROP TABLE IF EXISTS "tax_settings";
CREATE TABLE "tax_settings" (
	"id"	integer NOT NULL,
	"temple_id"	integer NOT NULL,
	"year"	integer NOT NULL,
	"tax_amount"	float NOT NULL,
	"description"	varchar(255),
	"is_active"	boolean DEFAULT '1',
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"include_previous_years"	boolean DEFAULT '0',
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "temples";
CREATE TABLE "temples" (
	"id"	integer NOT NULL,
	"name"	varchar(255) NOT NULL,
	"registration_id"	varchar(255),
	"address"	TEXT,
	"phone"	TEXT,
	"email"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "user_heirs";
CREATE TABLE "user_heirs" (
	"id"	integer NOT NULL,
	"registration_id"	integer NOT NULL,
	"serial_number"	integer NOT NULL DEFAULT '1',
	"name"	varchar(255) NOT NULL,
	"race"	varchar(255),
	"marital_status"	varchar(255),
	"education"	varchar(255),
	"birth_date"	varchar(255),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("registration_id") REFERENCES "user_registrations"("id") on delete CASCADE
);
DROP TABLE IF EXISTS "user_permissions";
CREATE TABLE "user_permissions" (
	"id"	integer NOT NULL,
	"user_id"	integer,
	"permission_id"	varchar(255) NOT NULL,
	"access_level"	text DEFAULT 'none' CHECK("access_level" IN ('full', 'view', 'none')),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("user_id") REFERENCES "users"("id") on delete CASCADE
);
DROP TABLE IF EXISTS "user_registrations";
CREATE TABLE "user_registrations" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"reference_number"	varchar(255),
	"date"	varchar(255),
	"subdivision"	varchar(255),
	"name"	varchar(255) NOT NULL,
	"username"	varchar(255),
	"email"	varchar(255),
	"alternative_name"	varchar(255),
	"wife_name"	varchar(255),
	"education"	varchar(255),
	"occupation"	varchar(255),
	"father_name"	varchar(255),
	"address"	varchar(255),
	"birth_date"	varchar(255),
	"village"	varchar(255),
	"mobile_number"	varchar(255),
	"aadhaar_number"	varchar(255),
	"pan_number"	varchar(255),
	"clan"	varchar(255),
	"group"	varchar(255),
	"postal_code"	varchar(255),
	"male_heirs"	integer DEFAULT '0',
	"female_heirs"	integer DEFAULT '0',
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"photo_path"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "user_settings";
CREATE TABLE "user_settings" (
	"id"	integer NOT NULL,
	"user_id"	integer NOT NULL,
	"landing_route"	varchar(255) DEFAULT '/dashboard',
	"sidebar_collapsed_default"	boolean NOT NULL DEFAULT '0',
	"hidden_menu_keys"	text,
	"quick_actions"	text,
	"language"	varchar(32),
	"theme"	varchar(32),
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "user_tax_registrations";
CREATE TABLE "user_tax_registrations" (
	"id"	integer NOT NULL,
	"temple_id"	integer DEFAULT '1',
	"reference_number"	varchar(255),
	"date"	varchar(255),
	"subdivision"	varchar(255),
	"name"	varchar(255) NOT NULL,
	"alternative_name"	varchar(255),
	"wife_name"	varchar(255),
	"education"	varchar(255),
	"occupation"	varchar(255),
	"father_name"	varchar(255),
	"address"	varchar(255),
	"birth_date"	varchar(255),
	"village"	varchar(255),
	"mobile_number"	varchar(255),
	"aadhaar_number"	varchar(255),
	"pan_number"	varchar(255),
	"clan"	varchar(255),
	"group"	varchar(255),
	"postal_code"	varchar(255),
	"male_heirs"	integer DEFAULT '0',
	"female_heirs"	integer DEFAULT '0',
	"created_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	datetime DEFAULT CURRENT_TIMESTAMP,
	"amount_paid"	DECIMAL(10, 2) DEFAULT 0,
	"outstanding_amount"	DECIMAL(10, 2) DEFAULT 0,
	"is_approved"	BOOLEAN DEFAULT 0,
	"approved_by"	INTEGER,
	"approved_at"	TIMESTAMP,
	"note"	TEXT,
	"year"	INTEGER,
	"tax_amount"	DECIMAL(10, 2) DEFAULT 0,
	"transfer_to_account"	TEXT,
	"donation_amount"	DECIMAL(10, 2) DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("approved_by") REFERENCES "users"("id")
);
DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (
	"id"	INTEGER,
	"username"	TEXT NOT NULL UNIQUE,
	"email"	TEXT NOT NULL UNIQUE,
	"full_name"	TEXT NOT NULL,
	"mobile"	TEXT,
	"password"	TEXT NOT NULL,
	"role"	TEXT NOT NULL,
	"status"	TEXT NOT NULL DEFAULT 'active',
	"temple_id"	INTEGER NOT NULL,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"last_login"	datetime,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "wedding_events";
CREATE TABLE "wedding_events" (
	"id"	INTEGER,
	"kanikalar_id"	INTEGER NOT NULL,
	"event_name"	TEXT NOT NULL,
	"event_date"	TEXT NOT NULL,
	"event_time"	TEXT NOT NULL,
	"location"	TEXT NOT NULL,
	"description"	TEXT,
	"created_by"	INTEGER NOT NULL,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
	FOREIGN KEY("kanikalar_id") REFERENCES "kanikalar"("id") ON DELETE CASCADE
);
DROP VIEW IF EXISTS "profit_and_loss";
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
    month DESC;
DROP INDEX IF EXISTS "annadhanam_approval_logs_action_index";
CREATE INDEX "annadhanam_approval_logs_action_index" ON "annadhanam_approval_logs" (
	"action"
);
DROP INDEX IF EXISTS "annadhanam_approval_logs_annadhanam_id_index";
CREATE INDEX "annadhanam_approval_logs_annadhanam_id_index" ON "annadhanam_approval_logs" (
	"annadhanam_id"
);
DROP INDEX IF EXISTS "annadhanam_from_date_index";
CREATE INDEX "annadhanam_from_date_index" ON "annadhanam" (
	"from_date"
);
DROP INDEX IF EXISTS "annadhanam_mobile_number_index";
CREATE INDEX "annadhanam_mobile_number_index" ON "annadhanam" (
	"mobile_number"
);
DROP INDEX IF EXISTS "annadhanam_name_index";
CREATE INDEX "annadhanam_name_index" ON "annadhanam" (
	"name"
);
DROP INDEX IF EXISTS "annadhanam_receipt_number_index";
CREATE INDEX "annadhanam_receipt_number_index" ON "annadhanam" (
	"receipt_number"
);
DROP INDEX IF EXISTS "annadhanam_temple_id_index";
CREATE INDEX "annadhanam_temple_id_index" ON "annadhanam" (
	"temple_id"
);
DROP INDEX IF EXISTS "annadhanam_to_date_index";
CREATE INDEX "annadhanam_to_date_index" ON "annadhanam" (
	"to_date"
);
DROP INDEX IF EXISTS "donation_products_label_unique";
CREATE UNIQUE INDEX "donation_products_label_unique" ON "donation_products" (
	"label"
);
DROP INDEX IF EXISTS "donation_products_value_unique";
CREATE UNIQUE INDEX "donation_products_value_unique" ON "donation_products" (
	"value"
);
DROP INDEX IF EXISTS "donations_approval_logs_action_index";
CREATE INDEX "donations_approval_logs_action_index" ON "donations_approval_logs" (
	"action"
);
DROP INDEX IF EXISTS "donations_approval_logs_donation_id_index";
CREATE INDEX "donations_approval_logs_donation_id_index" ON "donations_approval_logs" (
	"donation_id"
);
DROP INDEX IF EXISTS "hall_approval_logs_action_index";
CREATE INDEX "hall_approval_logs_action_index" ON "hall_approval_logs" (
	"action"
);
DROP INDEX IF EXISTS "hall_approval_logs_booking_id_index";
CREATE INDEX "hall_approval_logs_booking_id_index" ON "hall_approval_logs" (
	"booking_id"
);
DROP INDEX IF EXISTS "idx_annadhanam_from_date";
CREATE INDEX "idx_annadhanam_from_date" ON "annadhanam" (
	"from_date"
);
DROP INDEX IF EXISTS "idx_annadhanam_mobile";
CREATE INDEX "idx_annadhanam_mobile" ON "annadhanam" (
	"mobile_number"
);
DROP INDEX IF EXISTS "idx_annadhanam_name";
CREATE INDEX "idx_annadhanam_name" ON "annadhanam" (
	"name"
);
DROP INDEX IF EXISTS "idx_annadhanam_receipt_number";
CREATE INDEX "idx_annadhanam_receipt_number" ON "annadhanam" (
	"receipt_number"
);
DROP INDEX IF EXISTS "idx_annadhanam_temple";
CREATE INDEX "idx_annadhanam_temple" ON "annadhanam" (
	"temple_id"
);
DROP INDEX IF EXISTS "idx_annadhanam_to_date";
CREATE INDEX "idx_annadhanam_to_date" ON "annadhanam" (
	"to_date"
);
DROP INDEX IF EXISTS "idx_journal_date";
CREATE INDEX "idx_journal_date" ON "journal_entries" (
	"date"
);
DROP INDEX IF EXISTS "idx_journal_entries_date";
CREATE INDEX "idx_journal_entries_date" ON "journal_entries" (
	"date"
);
DROP INDEX IF EXISTS "idx_journal_entries_from";
CREATE INDEX "idx_journal_entries_from" ON "journal_entries" (
	"from_account"
);
DROP INDEX IF EXISTS "idx_journal_entries_temple";
CREATE INDEX "idx_journal_entries_temple" ON "journal_entries" (
	"temple_id"
);
DROP INDEX IF EXISTS "idx_journal_entries_to";
CREATE INDEX "idx_journal_entries_to" ON "journal_entries" (
	"to_account"
);
DROP INDEX IF EXISTS "idx_journal_from";
CREATE INDEX "idx_journal_from" ON "journal_entries" (
	"from_account"
);
DROP INDEX IF EXISTS "idx_journal_temple";
CREATE INDEX "idx_journal_temple" ON "journal_entries" (
	"temple_id"
);
DROP INDEX IF EXISTS "idx_journal_to";
CREATE INDEX "idx_journal_to" ON "journal_entries" (
	"to_account"
);
DROP INDEX IF EXISTS "idx_ledger_accounts_date";
CREATE INDEX "idx_ledger_accounts_date" ON "ledger_accounts" (
	"date"
);
DROP INDEX IF EXISTS "idx_ledger_accounts_name";
CREATE INDEX "idx_ledger_accounts_name" ON "ledger_accounts" (
	"name"
);
DROP INDEX IF EXISTS "idx_ledger_accounts_under";
CREATE INDEX "idx_ledger_accounts_under" ON "ledger_accounts" (
	"under"
);
DROP INDEX IF EXISTS "idx_ledger_entries_date";
CREATE INDEX "idx_ledger_entries_date" ON "ledger_entries" (
	"date"
);
DROP INDEX IF EXISTS "idx_ledger_entries_name";
CREATE INDEX "idx_ledger_entries_name" ON "ledger_entries" (
	"name"
);
DROP INDEX IF EXISTS "idx_ledger_entries_under";
CREATE INDEX "idx_ledger_entries_under" ON "ledger_entries" (
	"under"
);
DROP INDEX IF EXISTS "idx_pooja_from_date";
CREATE INDEX "idx_pooja_from_date" ON "pooja" (
	"from_date"
);
DROP INDEX IF EXISTS "idx_pooja_mobile";
CREATE INDEX "idx_pooja_mobile" ON "pooja" (
	"mobile_number"
);
DROP INDEX IF EXISTS "idx_pooja_name";
CREATE INDEX "idx_pooja_name" ON "pooja" (
	"name"
);
DROP INDEX IF EXISTS "idx_pooja_receipt_number";
CREATE INDEX "idx_pooja_receipt_number" ON "pooja" (
	"receipt_number"
);
DROP INDEX IF EXISTS "idx_pooja_temple";
CREATE INDEX "idx_pooja_temple" ON "pooja" (
	"temple_id"
);
DROP INDEX IF EXISTS "idx_pooja_to_date";
CREATE INDEX "idx_pooja_to_date" ON "pooja" (
	"to_date"
);
DROP INDEX IF EXISTS "idx_properties_created_by";
CREATE INDEX "idx_properties_created_by" ON "properties" (
	"created_by"
);
DROP INDEX IF EXISTS "idx_properties_temple";
CREATE INDEX "idx_properties_temple" ON "properties" (
	"temple_id"
);
DROP INDEX IF EXISTS "idx_properties_temple_id";
CREATE INDEX "idx_properties_temple_id" ON "properties" (
	"temple_id"
);
DROP INDEX IF EXISTS "idx_receipts_date";
CREATE INDEX "idx_receipts_date" ON "receipts" (
	"date"
);
DROP INDEX IF EXISTS "idx_receipts_register_no";
CREATE INDEX "idx_receipts_register_no" ON "receipts" (
	"register_no"
);
DROP INDEX IF EXISTS "idx_receipts_temple_id";
CREATE INDEX "idx_receipts_temple_id" ON "receipts" (
	"temple_id"
);
DROP INDEX IF EXISTS "idx_role_permissions_permission";
CREATE INDEX "idx_role_permissions_permission" ON "role_permissions" (
	"permission_id"
);
DROP INDEX IF EXISTS "idx_role_permissions_role";
CREATE INDEX "idx_role_permissions_role" ON "role_permissions" (
	"role_id"
);
DROP INDEX IF EXISTS "ledger_categories_label_unique";
CREATE UNIQUE INDEX "ledger_categories_label_unique" ON "ledger_categories" (
	"label"
);
DROP INDEX IF EXISTS "ledger_categories_value_unique";
CREATE UNIQUE INDEX "ledger_categories_value_unique" ON "ledger_categories" (
	"value"
);
DROP INDEX IF EXISTS "pdf_settings_temple_id_unique";
CREATE UNIQUE INDEX "pdf_settings_temple_id_unique" ON "pdf_settings" (
	"temple_id"
);
DROP INDEX IF EXISTS "pooja_approval_logs_action_index";
CREATE INDEX "pooja_approval_logs_action_index" ON "pooja_approval_logs" (
	"action"
);
DROP INDEX IF EXISTS "pooja_approval_logs_pooja_id_index";
CREATE INDEX "pooja_approval_logs_pooja_id_index" ON "pooja_approval_logs" (
	"pooja_id"
);
DROP INDEX IF EXISTS "pooja_from_date_index";
CREATE INDEX "pooja_from_date_index" ON "pooja" (
	"from_date"
);
DROP INDEX IF EXISTS "pooja_mobile_number_index";
CREATE INDEX "pooja_mobile_number_index" ON "pooja" (
	"mobile_number"
);
DROP INDEX IF EXISTS "pooja_name_index";
CREATE INDEX "pooja_name_index" ON "pooja" (
	"name"
);
DROP INDEX IF EXISTS "pooja_receipt_number_index";
CREATE INDEX "pooja_receipt_number_index" ON "pooja" (
	"receipt_number"
);
DROP INDEX IF EXISTS "pooja_temple_id_index";
CREATE INDEX "pooja_temple_id_index" ON "pooja" (
	"temple_id"
);
DROP INDEX IF EXISTS "pooja_to_date_index";
CREATE INDEX "pooja_to_date_index" ON "pooja" (
	"to_date"
);
DROP INDEX IF EXISTS "tax_settings_temple_id_year_unique";
CREATE UNIQUE INDEX "tax_settings_temple_id_year_unique" ON "tax_settings" (
	"temple_id",
	"year"
);
DROP INDEX IF EXISTS "user_permissions_user_id_permission_id_unique";
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_unique" ON "user_permissions" (
	"user_id",
	"permission_id"
);
DROP INDEX IF EXISTS "user_settings_user_id_unique";
CREATE UNIQUE INDEX "user_settings_user_id_unique" ON "user_settings" (
	"user_id"
);
COMMIT;
