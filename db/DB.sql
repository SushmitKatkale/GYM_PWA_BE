CREATE DATABASE IF NOT EXISTS fitespero;
USE fitespero;

-- USERS
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role TINYINT NOT NULL DEFAULT 1 COMMENT '1=member,2=owner,3=trainer,4=admin',
    record_status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- USER PROFILES
CREATE TABLE user_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    dob DATE,
    gender ENUM('male','female','other'),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    bio TEXT,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- EMERGENCY CONTACTS
CREATE TABLE emergency_contacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100),
    phone VARCHAR(20),
    relation VARCHAR(50),
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GYMS
CREATE TABLE gyms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    owner_id BIGINT NOT NULL,
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    rating DECIMAL(3,2) DEFAULT 0.00,
    capacity INT DEFAULT 0,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GYM QR CODES
CREATE TABLE gym_qr_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gym_id BIGINT NOT NULL,
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- CHECK-IN METHODS MASTER
CREATE TABLE checkin_methods (
    id TINYINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., gym_qr_scan, gym_code, quick_checkin, owner_scan_user, fingerprint, face_scan',
    description VARCHAR(150)
);

-- GYM-SPECIFIC CHECK-IN METHODS
CREATE TABLE gym_checkin_methods (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gym_id BIGINT NOT NULL,
    method_id TINYINT NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY (method_id) REFERENCES checkin_methods(id) ON DELETE CASCADE,
    UNIQUE (gym_id, method_id)
);

-- SUBSCRIPTIONS (with buffer support)
CREATE TABLE subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gym_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_months INT NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    buffer_days INT DEFAULT 0 COMMENT 'Extra days allowed after expiry',
    buffer_fee DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Fee for buffer days',
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- USER SUBSCRIPTIONS
CREATE TABLE user_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    subscription_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    buffer_applied TINYINT(1) DEFAULT 0 COMMENT '1=buffer purchased',
    buffer_start_date DATE,
    buffer_end_date DATE,
    buffer_fee_paid DECIMAL(10,2) DEFAULT 0.00,
    record_status TINYINT(1) DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- ATTENDANCES
CREATE TABLE attendances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    gym_id BIGINT NOT NULL,
    method_id TINYINT NOT NULL,
    check_in_time DATETIME NOT NULL,
    check_out_time DATETIME,
    duration_minutes INT,
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (gym_id) REFERENCES gyms(id),
    FOREIGN KEY (method_id) REFERENCES checkin_methods(id)
);

-- PAYMENTS
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    gym_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TINYINT NOT NULL DEFAULT 0 COMMENT '0=pending,1=success,2=failed',
    gateway ENUM('razorpay','phonepe','stripe') NOT NULL,
    payment_ref_no VARCHAR(100) UNIQUE NOT NULL,
    commission_percent DECIMAL(5,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- PAYMENT ITEMS
CREATE TABLE payment_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    description VARCHAR(150) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    item_type ENUM('subscription','buffer','addon') DEFAULT 'subscription',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- REFUNDS
CREATE TABLE refunds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    status ENUM('pending','processed','failed') DEFAULT 'pending',
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- INVOICES
CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    gym_id BIGINT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    issued_date DATE NOT NULL,
    file_path VARCHAR(255),
    record_status TINYINT(1) DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- INVOICE ITEMS
CREATE TABLE invoice_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    description VARCHAR(150) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    item_type ENUM('subscription','buffer','addon') DEFAULT 'subscription',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- WALLETS
CREATE TABLE wallets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    owner_type ENUM('admin','owner') NOT NULL,
    balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (owner_id, owner_type)
);

-- WALLET TRANSACTIONS
CREATE TABLE wallet_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    wallet_id BIGINT NOT NULL,
    type ENUM('credit','debit') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(255),
    reference_type ENUM('subscription','buffer','attendance','withdrawal') NOT NULL,
    reference_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- WITHDRAW REQUESTS
CREATE TABLE withdraw_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    wallet_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('pending','approved','rejected','processed') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

-- GYM SLOTS
CREATE TABLE gym_slots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gym_id BIGINT NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- USER BOOKINGS
CREATE TABLE user_slot_bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    slot_id BIGINT NOT NULL,
    booking_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=booked,0=cancelled',
    booking_date DATE NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (slot_id) REFERENCES gym_slots(id),
    UNIQUE (user_id, slot_id, booking_date)
);

-- WAITLIST
CREATE TABLE slot_waitlist (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    slot_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    waitlist_position INT NOT NULL,
    status ENUM('waiting','cleared') DEFAULT 'waiting',
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES gym_slots(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ADVERTISEMENTS
CREATE TABLE advertisements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    target_url VARCHAR(255),
    type ENUM('banner','popup','carousel') DEFAULT 'banner',
    priority INT DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('draft','active','expired') DEFAULT 'draft',
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADVERTISEMENT ANALYTICS
CREATE TABLE advertisement_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    advertisement_id BIGINT NOT NULL,
    event_type ENUM('impression','click','close','share') NOT NULL,
    device VARCHAR(50),
    location VARCHAR(100),
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (advertisement_id) REFERENCES advertisements(id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200),
    body TEXT,
    type ENUM('system','promo','reminder') DEFAULT 'system',
    is_read TINYINT(1) DEFAULT 0,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- PUSH SUBSCRIPTIONS
CREATE TABLE push_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    endpoint TEXT NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- FITNESS GOALS
CREATE TABLE fitness_goals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    goal_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USER FITNESS GOALS
CREATE TABLE user_fitness_goals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    goal_id BIGINT NOT NULL,
    priority INT DEFAULT 0,
    target_date DATE,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (goal_id) REFERENCES fitness_goals(id)
);

-- GYM TRAINERS (mapping)
CREATE TABLE gym_trainers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gym_id BIGINT NOT NULL,
    trainer_id BIGINT NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (gym_id, trainer_id)
);

-- DIET PLANS
CREATE TABLE diet_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trainer_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    calories INT,
    protein_g INT,
    carbs_g INT,
    fats_g INT,
    status ENUM('active','archived') DEFAULT 'active',
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES users(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- DIET PLAN MEALS
CREATE TABLE diet_plan_meals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    meal_type ENUM('breakfast','lunch','snack','dinner','other') NOT NULL,
    meal_description TEXT NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES diet_plans(id) ON DELETE CASCADE
);

-- DIET CHANGE REQUESTS
CREATE TABLE diet_change_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    trainer_id BIGINT NOT NULL,
    plan_id BIGINT,
    request_text TEXT NOT NULL,
    status ENUM('pending','approved','rejected','fulfilled') DEFAULT 'pending',
    trainer_response TEXT,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (trainer_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES diet_plans(id)
);

-- DIET PLAN HISTORY
CREATE TABLE diet_plan_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    old_data JSON NOT NULL,
    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES diet_plans(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- -----------------------------------------------------------------------------------------------------------------------------------

-- UNIFIED MEDIA TABLE
CREATE TABLE media (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('user_profile','gym','advertisement','diet_plan','meal','other') NOT NULL,
    entity_id BIGINT NOT NULL,
    media_type ENUM('image','video','file') DEFAULT 'image',
    url VARCHAR(255) NOT NULL,
    location VARCHAR(255) NULL COMMENT 'File system path for locally stored files',
    alt_text VARCHAR(150),
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_type, entity_id, url)
);

USE fitespero;

-- =========================================
-- 4. WALLET TRANSACTIONS - TRACEABILITY
-- =========================================
ALTER TABLE wallet_transactions
ADD COLUMN transaction_ref BIGINT NULL COMMENT 'Reference to payments.id, attendances.id, etc.' AFTER description,
ADD COLUMN transaction_ref_type ENUM('payment','attendance','refund','manual') DEFAULT 'manual' AFTER transaction_ref;

CREATE INDEX idx_wallet_txn_ref ON wallet_transactions(transaction_ref, transaction_ref_type);

-- =========================================
-- 5. PLANS - GENERIC SUPPORT FOR DIET + WORKOUT
-- =========================================
CREATE TABLE plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trainer_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type ENUM('diet','workout') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status ENUM('active','archived') DEFAULT 'active',
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES users(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Optional: Add back-link to diet_plans for future migration
ALTER TABLE diet_plans
ADD COLUMN plan_id BIGINT NULL AFTER id,
ADD CONSTRAINT fk_diet_plan_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL;

-- =========================================
-- 6. ATTENDANCE - ATTENDANCE TYPE
-- =========================================
ALTER TABLE attendances
ADD COLUMN attendance_type ENUM('normal','trial','guest') DEFAULT 'normal' AFTER gym_id;

CREATE INDEX idx_attendance_type ON attendances(attendance_type);

-- =========================================
-- 7. ADVERTISEMENTS - TARGETING OPTIONS
-- =========================================
ALTER TABLE advertisements
ADD COLUMN target_role ENUM('all','member','owner','trainer','admin') DEFAULT 'all' AFTER type,
ADD COLUMN target_gym_id BIGINT NULL AFTER target_role,
ADD COLUMN target_location VARCHAR(100) NULL AFTER target_gym_id;

ALTER TABLE advertisements
ADD CONSTRAINT fk_ads_gym FOREIGN KEY (target_gym_id) REFERENCES gyms(id) ON DELETE SET NULL;

CREATE INDEX idx_ads_target ON advertisements(target_role, target_gym_id, target_location);

-- =========================================
-- ✅ Backfill existing data (safe defaults)
-- =========================================
-- Existing wallet transactions → mark as manual
UPDATE wallet_transactions SET transaction_ref_type = 'manual' WHERE transaction_ref IS NULL;

-- Existing attendances → mark as normal
UPDATE attendances SET attendance_type = 'normal' WHERE attendance_type IS NULL;

-- Existing advertisements → target all users
UPDATE advertisements SET target_role = 'all' WHERE target_role IS NULL;

-- Master list of amenities
CREATE TABLE amenities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,   -- e.g., Parking, Wifi, Locker, Shower, Sauna
    description VARCHAR(255),
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mapping: gyms ↔ amenities
CREATE TABLE gym_amenities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gym_id BIGINT NOT NULL,
    amenity_id BIGINT NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE,
    UNIQUE (gym_id, amenity_id)
);

-- Master list of features
CREATE TABLE features (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,   -- e.g., Zumba, Yoga, Crossfit, Personal Training, Diet Consultation
    description VARCHAR(255),
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mapping: gyms ↔ features
CREATE TABLE gym_features (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gym_id BIGINT NOT NULL,
    feature_id BIGINT NOT NULL,
    record_status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
    UNIQUE (gym_id, feature_id)
);

ALTER TABLE gyms
ADD COLUMN email VARCHAR(150) NULL AFTER name,
ADD COLUMN phone VARCHAR(20) NULL AFTER email,
ADD COLUMN website_url VARCHAR(255) NULL AFTER phone,
ADD COLUMN gst_number VARCHAR(50) NULL AFTER website_url,
ADD COLUMN registration_no VARCHAR(50) NULL AFTER gst_number,
ADD COLUMN opening_time TIME NULL AFTER capacity,
ADD COLUMN closing_time TIME NULL AFTER opening_time,
ADD COLUMN days_open VARCHAR(50) NULL AFTER closing_time COMMENT 'e.g. Mon-Sat, Mon-Sun',
ADD COLUMN description TEXT NULL AFTER closing_time;
