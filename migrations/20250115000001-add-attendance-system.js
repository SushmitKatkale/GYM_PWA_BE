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
          type: Sequelize.ENUM('gym_qr_scan', 'gym_code', 'quick_checkin', 'owner_scan_user', 'fingerprint', 'face_scan'),
          allowNull: false,
          defaultValue: 'quick_checkin'
        },
        user_location_lat: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true
        },
        user_location_lng: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true
        },
        gym_location_lat: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true
        },
        gym_location_lng: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true
        },
        distance_from_gym: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: true,
          defaultValue: 0.0
        },
        duration_minutes: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0
        },
        qr_code_used: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        session_notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        session_rating: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        is_valid_session: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        device_info: {
          type: Sequelize.JSON,
          allowNull: true
        },
        create_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        update_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        created_by: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        updated_by: {
          type: Sequelize.STRING(255),
          allowNull: true
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
          references: {
            model: 'gyms',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        method_type: {
          type: Sequelize.ENUM('gym_qr_scan', 'gym_code', 'quick_checkin', 'owner_scan_user', 'fingerprint', 'face_scan'),
          allowNull: false,
          defaultValue: 'quick_checkin'
        },
        is_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        requires_location_check: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        max_distance_meters: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 50
        },
        priority_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        method_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: 'Quick Check-in'
        },
        method_description: {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: 'Simple location-based check-in'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        create_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        update_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        created_by: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        updated_by: {
          type: Sequelize.STRING(255),
          allowNull: true
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
        qr_type: {
          type: Sequelize.ENUM('permanent', 'temporary', 'daily'),
          allowNull: false,
          defaultValue: 'permanent'
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
        max_usage_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        qr_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: 'Gym QR Code'
        },
        qr_description: {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: 'Scan this QR code to check into the gym'
        },
        location_name: {
          type: Sequelize.STRING(100),
          allowNull: true,
          defaultValue: 'Main Entrance'
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        create_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        update_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
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
        code_type: {
          type: Sequelize.ENUM('permanent', 'daily', 'weekly', 'monthly'),
          allowNull: false,
          defaultValue: 'permanent'
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
        max_usage_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        code_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: 'Gym Access Code'
        },
        code_description: {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: 'Enter this code to check into the gym'
        },
        auto_regenerate: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        create_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        update_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }
      }, { transaction });

      // Add attendance fields to gyms table
      await queryInterface.addColumn('gyms', 'check_in_radius_meters', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50
      }, { transaction });

      await queryInterface.addColumn('gyms', 'default_session_duration_minutes', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 120
      }, { transaction });

      await queryInterface.addColumn('gyms', 'auto_checkout_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('gyms', 'auto_checkout_after_hours', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 24
      }, { transaction });

      await queryInterface.addColumn('gyms', 'location_verification_required', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'max_occupancy', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'allow_multiple_checkins', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('gyms', 'check_in_notification_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'check_out_notification_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'attendance_tracking_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'biometric_checkin_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('gyms', 'owner_scan_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'qr_code_checkin_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'unique_code_checkin_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('gyms', 'quick_checkin_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      // Add attendance preference fields to users table
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

      await queryInterface.addColumn('users', 'location_sharing_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('users', 'biometric_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('users', 'auto_checkin_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('users', 'checkin_notification_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('users', 'checkout_notification_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('users', 'location_accuracy_preference', {
        type: Sequelize.ENUM('high', 'medium', 'low'),
        allowNull: false,
        defaultValue: 'medium'
      }, { transaction });

      await queryInterface.addColumn('users', 'preferred_checkin_method', {
        type: Sequelize.ENUM('gym_qr_scan', 'gym_code', 'quick_checkin', 'owner_scan_user', 'fingerprint', 'face_scan'),
        allowNull: true,
        defaultValue: 'quick_checkin'
      }, { transaction });

      // Create indexes for performance
      // Attendance indexes
      await queryInterface.addIndex('attendances', ['user_email', 'check_in_time'], {
        name: 'idx_user_checkin',
        transaction
      });

      await queryInterface.addIndex('attendances', ['gym_id'], {
        name: 'idx_gym_date',
        transaction
      });

      await queryInterface.addIndex('attendances', ['user_email', 'check_out_time'], {
        name: 'idx_active_sessions',
        transaction
      });

      await queryInterface.addIndex('attendances', ['gym_id', 'check_out_time'], {
        name: 'idx_gym_active_sessions',
        transaction
      });

      await queryInterface.addIndex('attendances', ['user_location_lat', 'user_location_lng'], {
        name: 'idx_attendance_location',
        transaction
      });

      // Gym check-in methods indexes
      await queryInterface.addIndex('gym_checkin_methods', ['gym_id', 'method_type'], {
        name: 'unique_gym_method',
        unique: true,
        transaction
      });

      await queryInterface.addIndex('gym_checkin_methods', ['gym_id', 'is_enabled'], {
        name: 'idx_gym_enabled_methods',
        transaction
      });

      await queryInterface.addIndex('gym_checkin_methods', ['gym_id', 'priority_order'], {
        name: 'idx_method_priority',
        transaction
      });

      // Gym QR codes indexes
      await queryInterface.addIndex('gym_qr_codes', ['gym_id', 'is_active'], {
        name: 'idx_gym_active_qr',
        transaction
      });

      await queryInterface.addIndex('gym_qr_codes', ['qr_code', 'is_active'], {
        name: 'idx_qr_lookup',
        transaction
      });

      await queryInterface.addIndex('gym_qr_codes', ['expires_at', 'is_active'], {
        name: 'idx_qr_expiry',
        transaction
      });

      // Gym unique codes indexes
      await queryInterface.addIndex('gym_unique_codes', ['gym_id', 'is_active'], {
        name: 'idx_gym_active_codes',
        transaction
      });

      await queryInterface.addIndex('gym_unique_codes', ['unique_code', 'is_active'], {
        name: 'idx_code_lookup',
        transaction
      });

      await queryInterface.addIndex('gym_unique_codes', ['expires_at', 'is_active'], {
        name: 'idx_code_expiry',
        transaction
      });

      await transaction.commit();
      console.log('✅ Attendance system migration completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes first
      await queryInterface.removeIndex('attendances', 'idx_user_checkin', { transaction });
      await queryInterface.removeIndex('attendances', 'idx_gym_date', { transaction });
      await queryInterface.removeIndex('attendances', 'idx_active_sessions', { transaction });
      await queryInterface.removeIndex('attendances', 'idx_gym_active_sessions', { transaction });
      await queryInterface.removeIndex('attendances', 'idx_attendance_location', { transaction });
      
      await queryInterface.removeIndex('gym_checkin_methods', 'unique_gym_method', { transaction });
      await queryInterface.removeIndex('gym_checkin_methods', 'idx_gym_enabled_methods', { transaction });
      await queryInterface.removeIndex('gym_checkin_methods', 'idx_method_priority', { transaction });
      
      await queryInterface.removeIndex('gym_qr_codes', 'idx_gym_active_qr', { transaction });
      await queryInterface.removeIndex('gym_qr_codes', 'idx_qr_lookup', { transaction });
      await queryInterface.removeIndex('gym_qr_codes', 'idx_qr_expiry', { transaction });
      
      await queryInterface.removeIndex('gym_unique_codes', 'idx_gym_active_codes', { transaction });
      await queryInterface.removeIndex('gym_unique_codes', 'idx_code_lookup', { transaction });
      await queryInterface.removeIndex('gym_unique_codes', 'idx_code_expiry', { transaction });

      // Drop new tables
      await queryInterface.dropTable('gym_unique_codes', { transaction });
      await queryInterface.dropTable('gym_qr_codes', { transaction });
      await queryInterface.dropTable('gym_checkin_methods', { transaction });
      await queryInterface.dropTable('attendances', { transaction });

      // Remove columns from existing tables
      // From gyms table
      await queryInterface.removeColumn('gyms', 'check_in_radius_meters', { transaction });
      await queryInterface.removeColumn('gyms', 'default_session_duration_minutes', { transaction });
      await queryInterface.removeColumn('gyms', 'auto_checkout_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'auto_checkout_after_hours', { transaction });
      await queryInterface.removeColumn('gyms', 'location_verification_required', { transaction });
      await queryInterface.removeColumn('gyms', 'max_occupancy', { transaction });
      await queryInterface.removeColumn('gyms', 'allow_multiple_checkins', { transaction });
      await queryInterface.removeColumn('gyms', 'check_in_notification_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'check_out_notification_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'attendance_tracking_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'biometric_checkin_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'owner_scan_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'qr_code_checkin_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'unique_code_checkin_enabled', { transaction });
      await queryInterface.removeColumn('gyms', 'quick_checkin_enabled', { transaction });

      // From users table
      await queryInterface.removeColumn('users', 'default_gym_id', { transaction });
      await queryInterface.removeColumn('users', 'location_sharing_enabled', { transaction });
      await queryInterface.removeColumn('users', 'biometric_enabled', { transaction });
      await queryInterface.removeColumn('users', 'auto_checkin_enabled', { transaction });
      await queryInterface.removeColumn('users', 'checkin_notification_enabled', { transaction });
      await queryInterface.removeColumn('users', 'checkout_notification_enabled', { transaction });
      await queryInterface.removeColumn('users', 'location_accuracy_preference', { transaction });
      await queryInterface.removeColumn('users', 'preferred_checkin_method', { transaction });

      await transaction.commit();
      console.log('✅ Attendance system migration rollback completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration rollback failed:', error);
      throw error;
    }
  }
};
