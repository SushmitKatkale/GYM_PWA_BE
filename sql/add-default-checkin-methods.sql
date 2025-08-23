-- SQL Script to Add Default Check-in Methods for All Gyms
-- This script adds default check-in method configurations for gyms that don't have them yet

-- Check current state
SELECT 
    COUNT(*) as total_gyms,
    'Total active gyms' as description
FROM gyms 
WHERE active_status = 1;

SELECT 
    COUNT(*) as gyms_with_methods,
    'Gyms already with check-in methods' as description
FROM gym_check_in_methods;

-- Insert default check-in methods for gyms that don't have them yet
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
    g.id as gym_id,
    1 as quick_check_in_enabled,                    -- Enable quick check-in
    1 as qr_code_check_in_enabled,                  -- Enable QR code check-in
    1 as unique_code_check_in_enabled,              -- Enable unique code check-in
    1 as owner_scan_enabled,                        -- Enable owner scan
    0 as biometric_check_in_enabled,                -- Disable biometric (can be enabled later)
    100 as check_in_radius,                         -- 100 meters radius
    1 as location_validation_required,              -- Require location validation
    0 as auto_checkout_enabled,                     -- Disable auto-checkout by default
    480 as auto_checkout_after_minutes,             -- 8 hours if auto-checkout enabled
    240 as max_session_duration_minutes,            -- 4 hours max session
    0 as allow_multiple_active_sessions_per_user,   -- One active session per user
    0 as qr_code_location_required,                 -- QR codes don't require location
    1 as unique_code_location_required,             -- Unique codes require location
    1 as require_checkout_for_new_checkin,          -- Must checkout before new checkin
    1 as send_check_in_notifications,               -- Send check-in notifications
    1 as send_check_out_notifications,              -- Send check-out notifications
    15 as allow_grace_period_minutes,               -- 15 minutes grace period
    1 as track_session_duration,                    -- Track session duration
    0 as require_session_rating,                    -- Don't require session rating
    1 as is_active,                                 -- Active configuration
    COALESCE(g.owner_id, 'system') as created_by,   -- Use gym owner or system
    COALESCE(g.owner_id, 'system') as updated_by,   -- Use gym owner or system
    NOW() as create_timestamp,
    NOW() as update_timestamp
FROM gyms g
WHERE g.active_status = 1 
    AND g.id NOT IN (
        SELECT DISTINCT gym_id 
        FROM gym_check_in_methods 
        WHERE gym_id IS NOT NULL
    );

-- Check results after insertion
SELECT 
    COUNT(*) as gyms_with_methods_after,
    'Gyms with check-in methods after insertion' as description
FROM gym_check_in_methods;

-- Show summary of what was created
SELECT 
    g.name as gym_name,
    gcim.quick_check_in_enabled,
    gcim.qr_code_check_in_enabled,
    gcim.unique_code_check_in_enabled,
    gcim.owner_scan_enabled,
    gcim.check_in_radius,
    gcim.location_validation_required,
    gcim.created_by,
    gcim.create_timestamp
FROM gyms g
JOIN gym_check_in_methods gcim ON g.id = gcim.gym_id
WHERE g.active_status = 1
ORDER BY g.name;

-- Optional: Show gyms that still don't have check-in methods (should be empty)
SELECT 
    g.id,
    g.name,
    'Missing check-in methods' as status
FROM gyms g
WHERE g.active_status = 1 
    AND g.id NOT IN (
        SELECT DISTINCT gym_id 
        FROM gym_check_in_methods 
        WHERE gym_id IS NOT NULL
    );
