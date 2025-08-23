-- Fix foreign key constraint issues
-- This script drops and recreates the problematic tables with correct foreign key references

USE gym_pwa_db;

-- Drop tables with foreign key issues (in correct order to avoid constraint violations)
DROP TABLE IF EXISTS gym_qr_codes;
DROP TABLE IF EXISTS gym_unique_codes;

-- Recreate gym_qr_codes table with correct foreign key references
CREATE TABLE gym_qr_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gym_id INT NOT NULL,
  qr_code VARCHAR(255) NOT NULL UNIQUE,
  qr_type ENUM('permanent', 'temporary', 'daily') NOT NULL DEFAULT 'permanent',
  expires_at DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INT NOT NULL DEFAULT 0,
  max_usage_count INT NULL,
  qr_name VARCHAR(100) NOT NULL DEFAULT 'Gym QR Code',
  qr_description TEXT DEFAULT 'Scan this QR code to check into the gym',
  location_name VARCHAR(100) DEFAULT 'Main Entrance',
  created_by VARCHAR(255) NULL,
  create_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) NULL,
  
  -- Foreign key constraints
  FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
  
  -- Indexes
  INDEX idx_gym_active_qr (gym_id, is_active),
  INDEX idx_qr_lookup (qr_code, is_active),
  INDEX idx_qr_expiry (expires_at, is_active),
  INDEX idx_qr_type (qr_type, is_active),
  INDEX idx_qr_usage (usage_count, max_usage_count)
);

-- Recreate gym_unique_codes table with correct foreign key references
CREATE TABLE gym_unique_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gym_id INT NOT NULL,
  unique_code VARCHAR(10) NOT NULL UNIQUE,
  code_type ENUM('permanent', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'permanent',
  expires_at DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INT NOT NULL DEFAULT 0,
  max_usage_count INT NULL,
  code_name VARCHAR(100) NOT NULL DEFAULT 'Gym Access Code',
  code_description TEXT DEFAULT 'Enter this code to check into the gym',
  auto_regenerate BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(255) NULL,
  create_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) NULL,
  
  -- Foreign key constraints
  FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
  
  -- Indexes
  INDEX idx_gym_active_codes (gym_id, is_active),
  INDEX idx_code_lookup (unique_code, is_active),
  INDEX idx_code_expiry (expires_at, is_active),
  INDEX idx_code_type (code_type, is_active),
  INDEX idx_auto_regenerate (auto_regenerate, expires_at)
);
