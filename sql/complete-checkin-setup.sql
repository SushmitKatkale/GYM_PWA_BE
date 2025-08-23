-- Complete Check-in Methods Setup
-- This script creates the gym_check_in_methods table and populates it with default data

-- Create gym_check_in_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS `gym_check_in_methods` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `gym_id` int(11) NOT NULL,
  `quick_check_in_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `qr_code_check_in_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `unique_code_check_in_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `owner_scan_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `biometric_check_in_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `check_in_radius` int(11) NOT NULL DEFAULT 100 COMMENT 'Check-in radius in meters',
  `location_validation_required` tinyint(1) NOT NULL DEFAULT 1,
  `auto_checkout_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `auto_checkout_after_minutes` int(11) NOT NULL DEFAULT 480 COMMENT 'Auto checkout after X minutes of inactivity',
  `max_session_duration_minutes` int(11) NOT NULL DEFAULT 240 COMMENT 'Maximum allowed session duration',
  `allow_multiple_active_sessions_per_user` tinyint(1) NOT NULL DEFAULT 0,
  `qr_code_location_required` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether QR code check-in requires location validation',
  `unique_code_location_required` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether unique code check-in requires location validation',
  `require_checkout_for_new_checkin` tinyint(1) NOT NULL DEFAULT 1,
  `send_check_in_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `send_check_out_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `allow_grace_period_minutes` int(11) NOT NULL DEFAULT 15 COMMENT 'Grace period for late check-ins/early check-outs',
  `track_session_duration` tinyint(1) NOT NULL DEFAULT 1,
  `require_session_rating` tinyint(1) NOT NULL DEFAULT 0,
  `custom_check_in_message` text DEFAULT NULL COMMENT 'Custom message shown during check-in',
  `custom_check_out_message` text DEFAULT NULL COMMENT 'Custom message shown during check-out',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `create_timestamp` datetime NOT NULL,
  `update_timestamp` datetime NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_gym_checkin_methods` (`gym_id`),
  KEY `idx_gym_checkin_methods_gym_id` (`gym_id`),
  KEY `idx_gym_checkin_methods_active` (`is_active`),
  CONSTRAINT `gym_check_in_methods_ibfk_1` FOREIGN KEY (`gym_id`) REFERENCES `gyms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check current state
SELECT COUNT(*) as total_active_gyms FROM gyms WHERE active_status = 1;

SELECT COUNT(*) as existing_checkin_methods FROM gym_check_in_methods;

-- Insert default check-in methods for all active gyms
INSERT INTO gym_check_in_methods (
    gym_id,
    quick_check_in_enabled,
    qr_code_check_in_enabled,
    unique_code_check_in_enabled,
    owner_scan_enabled,
    biometric_check_in_enabled,
    check_in_radius,
    location_validation_required,
    auto_checkout_enabled,
    auto_checkout_after_minutes,
    max_session_duration_minutes,
    allow_multiple_active_sessions_per_user,
    qr_code_location_required,
    unique_code_location_required,
    require_checkout_for_new_checkin,
    send_check_in_notifications,
    send_check_out_notifications,
    allow_grace_period_minutes,
    track_session_duration,
    require_session_rating,
    is_active,
    created_by,
    updated_by,
    create_timestamp,
    update_timestamp
)
SELECT 
    g.id,
    1,     -- quick_check_in_enabled
    1,     -- qr_code_check_in_enabled  
    1,     -- unique_code_check_in_enabled
    1,     -- owner_scan_enabled
    0,     -- biometric_check_in_enabled
    100,   -- check_in_radius (100m)
    1,     -- location_validation_required
    0,     -- auto_checkout_enabled
    480,   -- auto_checkout_after_minutes (8 hours)
    240,   -- max_session_duration_minutes (4 hours)
    0,     -- allow_multiple_active_sessions_per_user
    0,     -- qr_code_location_required
    1,     -- unique_code_location_required
    1,     -- require_checkout_for_new_checkin
    1,     -- send_check_in_notifications
    1,     -- send_check_out_notifications
    15,    -- allow_grace_period_minutes
    1,     -- track_session_duration
    0,     -- require_session_rating
    1,     -- is_active
    COALESCE(g.owner_id, 'system'),  -- created_by
    COALESCE(g.owner_id, 'system'),  -- updated_by
    NOW(),  -- create_timestamp
    NOW()   -- update_timestamp
FROM gyms g
WHERE g.active_status = 1
ON DUPLICATE KEY UPDATE
    update_timestamp = NOW(),
    updated_by = COALESCE(g.owner_id, 'system');

-- Show final results
SELECT COUNT(*) as total_checkin_methods_after FROM gym_check_in_methods;

-- Show summary of created check-in methods
SELECT 
    g.name as gym_name,
    gcim.quick_check_in_enabled,
    gcim.qr_code_check_in_enabled,
    gcim.unique_code_check_in_enabled,
    gcim.owner_scan_enabled,
    gcim.biometric_check_in_enabled,
    gcim.check_in_radius,
    gcim.location_validation_required,
    gcim.create_timestamp
FROM gyms g
JOIN gym_check_in_methods gcim ON g.id = gcim.gym_id
WHERE g.active_status = 1
ORDER BY g.name
LIMIT 5;
