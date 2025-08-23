const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixForeignKeyConstraints() {
  console.log('🔧 Fixing foreign key constraints...');
  
  // Create connection to database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gym_pwa_db'
  });

  try {
    console.log('✅ Connected to database');

    // Drop tables with foreign key issues
    console.log('🗑️ Dropping problematic tables...');
    await connection.execute('DROP TABLE IF EXISTS gym_qr_codes');
    await connection.execute('DROP TABLE IF EXISTS gym_unique_codes');
    console.log('✅ Dropped tables');

    // Recreate gym_qr_codes table
    console.log('📱 Creating gym_qr_codes table...');
    await connection.execute(`
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
        qr_description TEXT NULL,
        location_name VARCHAR(100) DEFAULT 'Main Entrance',
        created_by VARCHAR(255) NULL,
        create_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        update_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(255) NULL,
        
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
        
        INDEX idx_gym_active_qr (gym_id, is_active),
        INDEX idx_qr_lookup (qr_code, is_active),
        INDEX idx_qr_expiry (expires_at, is_active),
        INDEX idx_qr_type (qr_type, is_active),
        INDEX idx_qr_usage (usage_count, max_usage_count)
      )
    `);
    console.log('✅ Created gym_qr_codes table');

    // Recreate gym_unique_codes table
    console.log('🔢 Creating gym_unique_codes table...');
    await connection.execute(`
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
        code_description TEXT NULL,
        auto_regenerate BOOLEAN NOT NULL DEFAULT FALSE,
        created_by VARCHAR(255) NULL,
        create_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        update_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(255) NULL,
        
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(email) ON DELETE SET NULL ON UPDATE CASCADE,
        
        INDEX idx_gym_active_codes (gym_id, is_active),
        INDEX idx_code_lookup (unique_code, is_active),
        INDEX idx_code_expiry (expires_at, is_active),
        INDEX idx_code_type (code_type, is_active),
        INDEX idx_auto_regenerate (auto_regenerate, expires_at)
      )
    `);
    console.log('✅ Created gym_unique_codes table');

    console.log('🎉 Foreign key constraints fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing foreign key constraints:', error);
  } finally {
    await connection.end();
    console.log('🔌 Database connection closed');
  }
}

fixForeignKeyConstraints()
  .then(() => {
    console.log('✅ Fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
