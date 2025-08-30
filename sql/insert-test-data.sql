-- Insert Test Data for Gym Attendance System
-- This script adds sample users, gyms, QR codes, unique codes, and check-in methods for testing

-- Insert test users with BIGINT IDs
INSERT IGNORE INTO users (
    email, id, first_name, last_name, username, password, phone_number, role, 
    record_status, is_verified, created_at, updated_at
) VALUES 
-- Regular users (role = 1)
('john.doe@gmail.com', 100001, 'John', 'Doe', 'johndoe', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567890', 1, 1, 1, NOW(), NOW()),
('jane.smith@gmail.com', 100002, 'Jane', 'Smith', 'janesmith', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567891', 1, 1, 1, NOW(), NOW()),
('mike.wilson@gmail.com', 100003, 'Mike', 'Wilson', 'mikewilson', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567892', 1, 1, 1, NOW(), NOW()),
('sarah.johnson@gmail.com', 100004, 'Sarah', 'Johnson', 'sarahjohnson', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567893', 1, 1, 1, NOW(), NOW()),
('alex.brown@gmail.com', 100005, 'Alex', 'Brown', 'alexbrown', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567894', 1, 1, 1, NOW(), NOW()),

-- Gym owners (role = 2)
('gymowner1@gmail.com', 200001, 'David', 'Miller', 'gymowner1', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567895', 2, 1, 1, NOW(), NOW()),
('gymowner2@gmail.com', 200002, 'Lisa', 'Garcia', 'gymowner2', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567896', 2, 1, 1, NOW(), NOW()),

-- Admin (role = 4)
('admin@gym.com', 900001, 'System', 'Admin', 'sysadmin', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IgFuMj1HjN7XSbtCOBo2AKe1YLRBhS', '+1234567897', 4, 1, 1, NOW(), NOW());

-- Insert test gyms with updated field names and user IDs
INSERT IGNORE INTO gyms (
    name, capacity, address, latitude, longitude, description, opening_time, closing_time,
    record_status, owner_id, rating, current_occupancy, city, state, zip_code,
    check_in_radius_meters, default_session_duration_minutes, auto_checkout_enabled,
    location_verification_required, max_occupancy, allow_multiple_checkins,
    attendance_tracking_enabled, quick_checkin_enabled, qr_code_checkin_enabled,
    unique_code_checkin_enabled, owner_scan_enabled, biometric_checkin_enabled,
    created_at, updated_at, created_by, updated_by
) VALUES
(1, 'FitZone Central', 150, '123 Main St, Downtown', 40.7128, -74.0060, 
 'Modern fitness center with state-of-the-art equipment', '06:00:00', '22:00:00',
 1, 200001, 4.5, 0, 'New York', 'NY', '10001',
 100, 120, 0, 1, 150, 0, 1, 1, 1, 1, 1, 0,
 NOW(), NOW(), 200001, 200001),

(2, 'PowerHouse Gym', 200, '456 Oak Ave, Midtown', 40.7589, -73.9851, 
 'Premium gym with personal training services', '05:00:00', '23:00:00',
 1, 200002, 4.8, 0, 'New York', 'NY', '10019',
 150, 120, 0, 1, 200, 0, 1, 1, 1, 1, 1, 0,
 NOW(), NOW(), 200002, 200002),

(3, 'Community Fitness', 100, '789 Pine St, Brooklyn', 40.6782, -73.9442, 
 'Affordable community gym for everyone', '07:00:00', '21:00:00',
 1, 200001, 4.2, 0, 'Brooklyn', 'NY', '11201',
 75, 90, 1, 1, 100, 0, 1, 1, 1, 1, 1, 0,
 NOW(), NOW(), 200001, 200001),

(4, 'Elite Fitness Club', 300, '321 Broadway, Manhattan', 40.7505, -73.9934, 
 'Luxury fitness club with spa services', '06:00:00', '22:00:00',
 1, 200002, 4.9, 0, 'New York', 'NY', '10013',
 120, 180, 0, 1, 300, 0, 1, 1, 1, 1, 1, 1,
 NOW(), NOW(), 200002, 200002);

-- Insert gym check-in methods for all gyms with updated field names
INSERT IGNORE INTO gym_check_in_methods (
    gym_id, quick_check_in_enabled, qr_code_check_in_enabled, unique_code_check_in_enabled,
    owner_scan_enabled, biometric_check_in_enabled, check_in_radius, location_validation_required,
    auto_checkout_enabled, auto_checkout_after_minutes, max_session_duration_minutes,
    allow_multiple_active_sessions_per_user, qr_code_location_required, unique_code_location_required,
    require_checkout_for_new_checkin, send_check_in_notifications, send_check_out_notifications,
    allow_grace_period_minutes, track_session_duration, require_session_rating,
    is_active, created_by, updated_by, created_at, updated_at
) VALUES
-- FitZone Central - All methods enabled
(1, 1, 1, 1, 1, 0, 100, 1, 0, 480, 240, 0, 0, 1, 1, 1, 1, 15, 1, 0, 1, 200001, 200001, NOW(), NOW()),

-- PowerHouse Gym - All methods enabled with biometric
(2, 1, 1, 1, 1, 1, 150, 1, 0, 480, 300, 0, 0, 1, 1, 1, 1, 10, 1, 1, 1, 200002, 200002, NOW(), NOW()),

-- Community Fitness - Basic methods, auto-checkout enabled
(3, 1, 1, 1, 1, 0, 75, 1, 1, 360, 180, 0, 1, 1, 1, 1, 1, 20, 1, 0, 1, 200001, 200001, NOW(), NOW()),

-- Elite Fitness Club - All premium features
(4, 1, 1, 1, 1, 1, 120, 1, 0, 600, 360, 0, 0, 0, 1, 1, 1, 5, 1, 1, 1, 200002, 200002, NOW(), NOW());

-- Insert gym QR codes with updated field names
INSERT IGNORE INTO gym_qr_codes (
    gym_id, qr_code, qr_type, qr_name, qr_description, usage_limit, usage_count,
    expires_at, is_active, created_by, updated_by, created_at, updated_at
) VALUES
-- FitZone Central QR Codes
(1, 'FITZONE_MAIN_001', 'main_entrance', 'Main Entrance', 'Primary QR code for main entrance check-in', NULL, 0, NULL, 1, 200001, 200001, NOW(), NOW()),
(1, 'FITZONE_LOCKER_001', 'locker_room', 'Locker Room', 'QR code for locker room area', NULL, 0, NULL, 1, 200001, 200001, NOW(), NOW()),

-- PowerHouse Gym QR Codes
(2, 'POWERHOUSE_MAIN_001', 'main_entrance', 'Main Entrance', 'Main entrance QR code', NULL, 0, NULL, 1, 200002, 200002, NOW(), NOW()),
(2, 'POWERHOUSE_VIP_001', 'vip_area', 'VIP Section', 'VIP area access QR code', 100, 0, DATE_ADD(NOW(), INTERVAL 30 DAY), 1, 200002, 200002, NOW(), NOW()),

-- Community Fitness QR Codes
(3, 'COMMUNITY_ENTRANCE_001', 'main_entrance', 'Main Door', 'Community gym main entrance', NULL, 0, NULL, 1, 200001, 200001, NOW(), NOW()),

-- Elite Fitness Club QR Codes
(4, 'ELITE_MAIN_001', 'main_entrance', 'Reception', 'Reception desk QR code', NULL, 0, NULL, 1, 200002, 200002, NOW(), NOW()),
(4, 'ELITE_SPA_001', 'spa_area', 'Spa Entrance', 'Spa area access code', 50, 0, DATE_ADD(NOW(), INTERVAL 60 DAY), 1, 200002, 200002, NOW(), NOW());

-- Insert gym unique codes with updated field names
INSERT IGNORE INTO gym_unique_codes (
    gym_id, unique_code, code_type, code_name, code_description, usage_limit, usage_count,
    expires_at, is_active, created_by, updated_by, created_at, updated_at
) VALUES
-- FitZone Central Unique Codes
(1, 'FIT2024', 'permanent', 'Permanent Access', 'Permanent access code for FitZone Central', NULL, 0, NULL, 1, 200001, 200001, NOW(), NOW()),
(1, 'DAILYFIT01', 'daily', 'Daily Code Jan 16', 'Daily access code for January 16, 2025', NULL, 0, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1, 200001, 200001, NOW(), NOW()),

-- PowerHouse Gym Unique Codes
(2, 'POWER2024', 'permanent', 'Permanent Access', 'Permanent access code for PowerHouse Gym', NULL, 0, NULL, 1, 200002, 200002, NOW(), NOW()),
(2, 'WEEKLY01', 'weekly', 'Weekly Code W3', 'Weekly access code - Week 3', NULL, 0, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1, 200002, 200002, NOW(), NOW()),
(2, 'VIP2024', 'monthly', 'VIP Monthly', 'VIP members monthly code', 200, 0, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1, 200002, 200002, NOW(), NOW()),

-- Community Fitness Unique Codes
(3, 'COMM2024', 'permanent', 'Community Access', 'Community gym permanent code', NULL, 0, NULL, 1, 200001, 200001, NOW(), NOW()),
(3, 'TRIAL01', 'trial', 'Trial Access', 'Trial access for new members', 10, 0, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 1, 200001, 200001, NOW(), NOW()),

-- Elite Fitness Club Unique Codes
(4, 'ELITE2024', 'permanent', 'Elite Access', 'Elite club permanent access', NULL, 0, NULL, 1, 200002, 200002, NOW(), NOW()),
(4, 'PREMIUM01', 'monthly', 'Premium Monthly', 'Premium members monthly code', 500, 0, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1, 200002, 200002, NOW(), NOW()),
(4, 'GUEST2024', 'temporary', 'Guest Access', 'Temporary guest access code', 5, 0, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1, 200002, 200002, NOW(), NOW());

-- Display summary of inserted data
SELECT 'USERS INSERTED' as category, COUNT(*) as count FROM users WHERE email LIKE '%@gmail.com' OR email LIKE '%@gym.com'
UNION ALL
SELECT 'GYMS INSERTED' as category, COUNT(*) as count FROM gyms WHERE id <= 4
UNION ALL
SELECT 'CHECK-IN METHODS' as category, COUNT(*) as count FROM gym_check_in_methods WHERE gym_id <= 4
UNION ALL
SELECT 'QR CODES INSERTED' as category, COUNT(*) as count FROM gym_qr_codes WHERE gym_id <= 4
UNION ALL
SELECT 'UNIQUE CODES INSERTED' as category, COUNT(*) as count FROM gym_unique_codes WHERE gym_id <= 4;

-- Show test login credentials
SELECT 
    'TEST LOGIN CREDENTIALS' as info,
    'Email: john.doe@gmail.com, Password: 123456, Type: User' as details
UNION ALL
SELECT '', 'Email: gymowner1@gmail.com, Password: 123456, Type: Gym Owner'
UNION ALL
SELECT '', 'Email: admin@gym.com, Password: 123456, Type: Admin'
UNION ALL
SELECT '', 'All users have password: 123456';

-- Show gym details for testing
SELECT 
    g.name as gym_name,
    g.id as gym_id,
    g.owner_id,
    CONCAT(g.latitude, ', ', g.longitude) as coordinates,
    gcim.quick_check_in_enabled,
    gcim.qr_code_check_in_enabled,
    gcim.unique_code_check_in_enabled,
    gcim.check_in_radius as radius_meters
FROM gyms g
JOIN gym_check_in_methods gcim ON g.id = gcim.gym_id
WHERE g.id <= 4
ORDER BY g.id;

-- Show sample QR codes and unique codes for testing
SELECT 
    'QR CODES' as type,
    g.name as gym_name,
    qr.qr_code as code,
    qr.qr_type as code_type,
    qr.qr_name as name
FROM gym_qr_codes qr
JOIN gyms g ON qr.gym_id = g.id
WHERE qr.gym_id <= 4
UNION ALL
SELECT 
    'UNIQUE CODES' as type,
    g.name as gym_name,
    uc.unique_code as code,
    uc.code_type as code_type,
    uc.code_name as name
FROM gym_unique_codes uc
JOIN gyms g ON uc.gym_id = g.id
WHERE uc.gym_id <= 4
ORDER BY type, gym_name;
