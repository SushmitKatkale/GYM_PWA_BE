const { sequelize } = require('../config/database');

/**
 * Add audit fields (created_by, updated_by) to all existing tables that don't have them
 * This script adds the missing audit columns to existing tables
 */

const addAuditFieldsToTables = async () => {
  try {
    console.log('🔄 Starting to add audit fields to existing tables...');

    // List of tables that need audit fields added
    const tablesToUpdate = [
      'users',
      'user_profiles', 
      'emergency_contacts',
      'fitness_goals',
      'user_fitness_goals',
      'gyms',
      'gym_qr_codes', // Already has created_by/updated_by but different structure
      'checkin_methods',
      'gym_checkin_methods',
      'attendances',
      'subscriptions',
      'user_subscriptions',
      'payments',
      'payment_items',
      'invoices',
      'invoice_items',
      'refunds',
      'wallets',
      'wallet_transactions',
      'withdraw_requests',
      'gym_slots',
      'user_slot_bookings',
      'slot_waitlist',
      'advertisements',
      'advertisement_analytics',
      'notifications',
      'push_subscriptions',
      'gym_trainers',
      'diet_plans',
      'diet_plan_meals',
      'diet_change_requests',
      'diet_plan_history',
      'plans',
      'media'
    ];

    for (const tableName of tablesToUpdate) {
      try {
        console.log(`\n📋 Processing table: ${tableName}`);
        
        // Check if columns already exist
        const [columns] = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = 'fitespero' 
          AND TABLE_NAME = '${tableName}'
          AND COLUMN_NAME IN ('created_by', 'updated_by')
        `);

        const existingColumns = columns.map(col => col.COLUMN_NAME);
        const hasCreatedBy = existingColumns.includes('created_by');
        const hasUpdatedBy = existingColumns.includes('updated_by');

        // Add created_by if it doesn't exist
        if (!hasCreatedBy) {
          console.log(`  ➕ Adding created_by to ${tableName}`);
          await sequelize.query(`
            ALTER TABLE \`${tableName}\` 
            ADD COLUMN \`created_by\` BIGINT NULL 
            COMMENT 'User ID who created this record'
          `);
        } else {
          console.log(`  ✅ created_by already exists in ${tableName}`);
        }

        // Add updated_by if it doesn't exist
        if (!hasUpdatedBy) {
          console.log(`  ➕ Adding updated_by to ${tableName}`);
          await sequelize.query(`
            ALTER TABLE \`${tableName}\` 
            ADD COLUMN \`updated_by\` BIGINT NULL 
            COMMENT 'User ID who last updated this record'
          `);
        } else {
          console.log(`  ✅ updated_by already exists in ${tableName}`);
        }

        // Add foreign key constraints (optional, since we're allowing NULL)
        if (!hasCreatedBy) {
          try {
            console.log(`  🔗 Adding foreign key constraint for created_by in ${tableName}`);
            await sequelize.query(`
              ALTER TABLE \`${tableName}\` 
              ADD CONSTRAINT \`fk_${tableName}_created_by\` 
              FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) 
              ON DELETE SET NULL
            `);
          } catch (fkError) {
            console.log(`  ⚠️  Could not add FK constraint for created_by in ${tableName}: ${fkError.message}`);
          }
        }

        if (!hasUpdatedBy) {
          try {
            console.log(`  🔗 Adding foreign key constraint for updated_by in ${tableName}`);
            await sequelize.query(`
              ALTER TABLE \`${tableName}\` 
              ADD CONSTRAINT \`fk_${tableName}_updated_by\` 
              FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) 
              ON DELETE SET NULL
            `);
          } catch (fkError) {
            console.log(`  ⚠️  Could not add FK constraint for updated_by in ${tableName}: ${fkError.message}`);
          }
        }

        console.log(`  ✅ Completed processing ${tableName}`);

      } catch (tableError) {
        console.error(`  ❌ Error processing table ${tableName}:`, tableError.message);
      }
    }

    console.log('\n🎉 Audit fields migration completed!');
    console.log('\n📊 Summary:');
    console.log('- created_by: User ID who created the record');
    console.log('- updated_by: User ID who last updated the record');
    console.log('- Both fields are nullable and have FK constraints to users table');
    
  } catch (error) {
    console.error('❌ Error during audit fields migration:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  addAuditFieldsToTables()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addAuditFieldsToTables;
