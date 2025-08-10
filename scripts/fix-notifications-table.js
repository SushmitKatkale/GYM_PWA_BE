const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixNotificationsTable() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gym_pwa_db',
      multipleStatements: true
    });

    console.log('Connected to MySQL database');
    
    // First, let's check if the table exists and its structure
    console.log('\nChecking current notifications table structure...');
    try {
      const [rows] = await connection.execute('SHOW CREATE TABLE notifications');
      console.log('Current table structure:');
      console.log(rows[0]['Create Table']);
    } catch (error) {
      console.log('Table does not exist yet.');
    }

    // Try the safer approach first - just modify the existing table
    console.log('\nAttempting to add AUTO_INCREMENT to existing table...');
    
    try {
      await connection.execute(`
        ALTER TABLE \`notifications\` 
        MODIFY COLUMN \`id\` int(11) NOT NULL AUTO_INCREMENT;
      `);
      console.log('✅ Successfully added AUTO_INCREMENT to notifications table!');
    } catch (error) {
      console.log('❌ Could not modify existing table:', error.message);
      
      // If modification failed, let's recreate the table
      console.log('\nRecreating notifications table with proper structure...');
      
      // Read and execute the full table creation script
      const migrationPath = path.join(__dirname, '../migrations/fix-notifications-id-auto-increment.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await connection.execute(migrationSQL);
      console.log('✅ Successfully recreated notifications table with AUTO_INCREMENT!');
    }

    // Verify the final table structure
    console.log('\nVerifying final table structure...');
    const [finalRows] = await connection.execute('SHOW CREATE TABLE notifications');
    console.log('Final table structure:');
    console.log(finalRows[0]['Create Table']);

    // Test inserting a record
    console.log('\nTesting notification creation...');
    const [insertResult] = await connection.execute(`
      INSERT INTO notifications (title, message, type, category, priority, is_global, delivery_channels)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'Test Notification',
      'This is a test notification to verify AUTO_INCREMENT is working',
      'info',
      'system',
      'normal',
      true,
      JSON.stringify(['push'])
    ]);
    
    console.log(`✅ Test notification created with ID: ${insertResult.insertId}`);
    
    // Clean up the test record
    await connection.execute('DELETE FROM notifications WHERE title = ?', ['Test Notification']);
    console.log('✅ Test record cleaned up');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

// Run the migration
console.log('🔧 Starting notifications table migration...');
fixNotificationsTable().then(() => {
  console.log('\n🎉 Migration completed successfully!');
  process.exit(0);
});
