const { sequelize } = require('../config/database');

async function updateMediaEnum() {
  try {
    console.log('🔄 Updating media table entity_type ENUM...');
    
    // Update the entity_type ENUM to include 'exercise'
    await sequelize.query(`
      ALTER TABLE \`media\` 
      MODIFY COLUMN \`entity_type\` 
      ENUM('user_profile', 'gym', 'advertisement', 'diet_plan', 'meal', 'exercise', 'other') 
      NOT NULL
    `);
    
    console.log('✅ Successfully updated media table entity_type ENUM to include "exercise"');
    
    // Verify the change
    const [results] = await sequelize.query(`
      SHOW COLUMNS FROM media LIKE 'entity_type'
    `);
    
    console.log('📊 Current entity_type column definition:', results[0]);
    
  } catch (error) {
    console.error('❌ Error updating media table:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateMediaEnum()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
