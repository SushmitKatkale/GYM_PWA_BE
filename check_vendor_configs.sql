-- Query to check all vendor configuration data
-- Run these queries in your MySQL database to see the actual data

-- 1. Check all vendor configurations with all fields
SELECT 
    id,
    owner_email,
    gym_id,
    razorpay_vendor_id,
    cut_value,
    cut_type,
    is_razorpay_active,
    onboarding_status,
    onboarding_date,
    bank_account_verified,
    kyc_status,
    active_status,
    create_timestamp,
    created_by,
    update_timestamp,
    updated_by,
    razorpay_bank_account_id,
    razorpay_stakeholder_id
FROM vendor_payment_configs
ORDER BY update_timestamp DESC;

-- 2. Check data types for TINYINT fields
DESCRIBE vendor_payment_configs;

-- 3. Check specific vendor config by ID
SELECT * FROM vendor_payment_configs WHERE id = 1;

-- 4. Check vendor configs with gym information
SELECT 
    vpc.id,
    vpc.owner_email,
    g.name as gym_name,
    vpc.cut_value,
    vpc.cut_type,
    vpc.is_razorpay_active,
    vpc.onboarding_status,
    vpc.bank_account_verified,
    vpc.kyc_status,
    vpc.active_status,
    vpc.update_timestamp
FROM vendor_payment_configs vpc
LEFT JOIN gyms g ON vpc.gym_id = g.id
ORDER BY vpc.update_timestamp DESC;

-- 5. Check for any NULL values in boolean fields
SELECT 
    id,
    owner_email,
    CASE 
        WHEN is_razorpay_active IS NULL THEN 'NULL'
        WHEN is_razorpay_active = 1 THEN 'TRUE'
        ELSE 'FALSE'
    END as is_razorpay_active_status,
    CASE 
        WHEN bank_account_verified IS NULL THEN 'NULL'
        WHEN bank_account_verified = 1 THEN 'TRUE'
        ELSE 'FALSE'
    END as bank_account_verified_status,
    CASE 
        WHEN active_status IS NULL THEN 'NULL'
        WHEN active_status = 1 THEN 'TRUE'
        ELSE 'FALSE'
    END as active_status_value
FROM vendor_payment_configs;

-- 6. Test UPDATE query (replace ID and values as needed)
-- UPDATE vendor_payment_configs 
-- SET 
--     cut_value = 7.5,
--     cut_type = 'percentage',
--     is_razorpay_active = 1,
--     bank_account_verified = 1,
--     onboarding_status = 'completed',
--     kyc_status = 'verified',
--     active_status = 1,
--     razorpay_vendor_id = 'acc_TestVendor123',
--     razorpay_bank_account_id = 'ba_TestBank123',
--     razorpay_stakeholder_id = 'stakeholder_Test123',
--     update_timestamp = NOW(),
--     updated_by = 'test_admin@gym.com'
-- WHERE id = 1;

-- 7. Check if the update worked
-- SELECT * FROM vendor_payment_configs WHERE id = 1;
