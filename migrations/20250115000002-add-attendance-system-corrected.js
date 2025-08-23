'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Create attendances table
      await queryInterface.createTable('attendances', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          references: {
            model: 'users',
            key: 'email'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        gym_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'gyms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        check_in_time: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        check_out_time: {
          type: Sequelize.DATE,
          allowNull: true
        },
        check_in_method: {
          type: Sequelize.ENUM('quick_checkin', 'qr_code', 'unique_code', 'owner_scan'),
          allowNull: false,
          defaultValue: 'quick_checkin'
        },
        check_in_latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true
        },
        check_in_longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true
        },
        check_in_accuracy: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: true
        },
        check_out_latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true
        },
        check_out_longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true
        },
        check_out_accuracy: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: true
        },
        duration: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Duration in minutes'
        },
        status: {
          type: Sequelize.ENUM('checked_in', 'checked_out'),
          allowNull: false,
          defaultValue: 'checked_in'
        },
        qr_code_used: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        unique_code_used: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        checked_in_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Email of gym owner who checked in the user (for owner_scan method)'
        },
        checked_out_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Email of gym owner who checked out the user'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // Create gym_checkin_methods table
      await queryInterface.createTable('gym_checkin_methods', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        gym_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true, // One configuration per gym
          references: {
            model: 'gyms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        quick_check_in_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        qr_code_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        unique_code_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        owner_scan_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        biometric_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        check_in_radius: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100,
          comment: 'Check-in radius in meters'
        },
        qr_code_location_required: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        unique_code_location_required: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        allow_simultaneous_check_ins: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        max_check_in_duration: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 480,
          comment: 'Maximum check-in duration in minutes'
        },
        auto_check_out: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        location_accuracy_required: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 50,
          comment: 'Required location accuracy in meters'
        },
        notifications: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {
            checkInNotification: true,
            checkOutNotification: true,
            occupancyAlerts: true
          }
        },
        created_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'users',
            key: 'email'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        updated_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'users',
            key: 'email'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // Create gym_qr_codes table
      await queryInterface.createTable('gym_qr_codes', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        gym_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'gyms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        qr_code: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true
        },
        purpose: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: 'checkin'
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        usage_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        max_usage: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        created_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'users',
            key: 'email'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        updated_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'users',
            key: 'email'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // Create gym_unique_codes table
      await queryInterface.createTable('gym_unique_codes', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        gym_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'gyms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        unique_code: {
          type: Sequelize.STRING(10),
          allowNull: false,
          unique: true
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        usage_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        max_usage: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        created_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'users',
            key: 'email'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        updated_by: {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'users',
            key: 'email'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // Add attendance preference fields to users table (only if they don't exist)
      try {
        await queryInterface.addColumn('users', 'default_gym_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'gyms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
      } catch (err) {
        if (!err.message.includes('Duplicate column')) throw err;
        console.log('Column default_gym_id already exists in users table, skipping...');
      }

      try {
        await queryInterface.addColumn('users', 'location_sharing_enabled', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction });
      } catch (err) {
        if (!err.message.includes('Duplicate column')) throw err;
        console.log('Column location_sharing_enabled already exists in users table, skipping...');
      }

      try {
        await queryInterface.addColumn('users', 'biometric_check_in_enabled', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction });
      } catch (err) {
        if (!err.message.includes('Duplicate column')) throw err;
        console.log('Column biometric_check_in_enabled already exists in users table, skipping...');
      }

      try {
        await queryInterface.addColumn('users', 'preferred_check_in_method', {
          type: Sequelize.ENUM('quick_checkin', 'qr_code', 'unique_code', 'biometric'),
          allowNull: false,
          defaultValue: 'quick_checkin'
        }, { transaction });
      } catch (err) {
        if (!err.message.includes('Duplicate column')) throw err;
        console.log('Column preferred_check_in_method already exists in users table, skipping...');
      }

      try {
        await queryInterface.addColumn('users', 'check_in_notifications_enabled', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction });
      } catch (err) {
        if (!err.message.includes('Duplicate column')) throw err;
        console.log('Column check_in_notifications_enabled already exists in users table, skipping...');
      }

      try {
        await queryInterface.addColumn('users', 'location_accuracy_preference', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100,
          comment: 'Preferred location accuracy in meters'
        }, { transaction });
      } catch (err) {
        if (!err.message.includes('Duplicate column')) throw err;
        console.log('Column location_accuracy_preference already exists in users table, skipping...');
      }

      // Create indexes for better performance
      await queryInterface.addIndex('attendances', ['user_email'], { transaction });
      await queryInterface.addIndex('attendances', ['gym_id'], { transaction });
      await queryInterface.addIndex('attendances', ['check_in_time'], { transaction });
      await queryInterface.addIndex('attendances', ['status'], { transaction });
      await queryInterface.addIndex('attendances', ['user_email', 'status'], { transaction });
      await queryInterface.addIndex('attendances', ['gym_id', 'check_in_time'], { transaction });

      await queryInterface.addIndex('gym_qr_codes', ['gym_id'], { transaction });
      await queryInterface.addIndex('gym_qr_codes', ['qr_code'], { transaction });
      await queryInterface.addIndex('gym_qr_codes', ['is_active'], { transaction });
      await queryInterface.addIndex('gym_qr_codes', ['expires_at'], { transaction });

      await queryInterface.addIndex('gym_unique_codes', ['gym_id'], { transaction });
      await queryInterface.addIndex('gym_unique_codes', ['unique_code'], { transaction });
      await queryInterface.addIndex('gym_unique_codes', ['is_active'], { transaction });
      await queryInterface.addIndex('gym_unique_codes', ['expires_at'], { transaction });

      await queryInterface.addIndex('gym_checkin_methods', ['gym_id'], { transaction });

      await transaction.commit();
      console.log('✅ Attendance system migration completed successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Attendance system migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes
      await queryInterface.removeIndex('attendances', ['user_email'], { transaction });
      await queryInterface.removeIndex('attendances', ['gym_id'], { transaction });
      await queryInterface.removeIndex('attendances', ['check_in_time'], { transaction });
      await queryInterface.removeIndex('attendances', ['status'], { transaction });
      await queryInterface.removeIndex('attendances', ['user_email', 'status'], { transaction });
      await queryInterface.removeIndex('attendances', ['gym_id', 'check_in_time'], { transaction });

      await queryInterface.removeIndex('gym_qr_codes', ['gym_id'], { transaction });
      await queryInterface.removeIndex('gym_qr_codes', ['qr_code'], { transaction });
      await queryInterface.removeIndex('gym_qr_codes', ['is_active'], { transaction });
      await queryInterface.removeIndex('gym_qr_codes', ['expires_at'], { transaction });

      await queryInterface.removeIndex('gym_unique_codes', ['gym_id'], { transaction });
      await queryInterface.removeIndex('gym_unique_codes', ['unique_code'], { transaction });
      await queryInterface.removeIndex('gym_unique_codes', ['is_active'], { transaction });
      await queryInterface.removeIndex('gym_unique_codes', ['expires_at'], { transaction });

      await queryInterface.removeIndex('gym_checkin_methods', ['gym_id'], { transaction });

      // Drop tables
      await queryInterface.dropTable('attendances', { transaction });
      await queryInterface.dropTable('gym_checkin_methods', { transaction });
      await queryInterface.dropTable('gym_qr_codes', { transaction });
      await queryInterface.dropTable('gym_unique_codes', { transaction });

      // Remove user columns (only if they exist)
      try {
        await queryInterface.removeColumn('users', 'default_gym_id', { transaction });
      } catch (err) {
        console.log('Column default_gym_id does not exist in users table, skipping...');
      }

      try {
        await queryInterface.removeColumn('users', 'location_sharing_enabled', { transaction });
      } catch (err) {
        console.log('Column location_sharing_enabled does not exist in users table, skipping...');
      }

      try {
        await queryInterface.removeColumn('users', 'biometric_check_in_enabled', { transaction });
      } catch (err) {
        console.log('Column biometric_check_in_enabled does not exist in users table, skipping...');
      }

      try {
        await queryInterface.removeColumn('users', 'preferred_check_in_method', { transaction });
      } catch (err) {
        console.log('Column preferred_check_in_method does not exist in users table, skipping...');
      }

      try {
        await queryInterface.removeColumn('users', 'check_in_notifications_enabled', { transaction });
      } catch (err) {
        console.log('Column check_in_notifications_enabled does not exist in users table, skipping...');
      }

      try {
        await queryInterface.removeColumn('users', 'location_accuracy_preference', { transaction });
      } catch (err) {
        console.log('Column location_accuracy_preference does not exist in users table, skipping...');
      }

      await transaction.commit();
      console.log('✅ Attendance system migration rollback completed successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Attendance system migration rollback failed:', error);
      throw error;
    }
  }
};
