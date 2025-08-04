'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('profile_images', {
      id: {
        type: Sequelize.STRING(8),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique alphanumeric identifier for the profile image'
      },
      user_id: {
        type: Sequelize.STRING(8),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key reference to users table'
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original filename when uploaded'
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Stored filename on server'
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Full path to the stored image file'
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Public URL to access the image'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'MIME type of the image (e.g., image/jpeg, image/png)'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Image width in pixels'
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Image height in pixels'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this is the current active profile image'
      },
      upload_source: {
        type: Sequelize.ENUM('web', 'mobile', 'admin'),
        allowNull: false,
        defaultValue: 'web',
        comment: 'Source of the upload'
      },
      create_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_by: {
        type: Sequelize.STRING(8),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      update_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_by: {
        type: Sequelize.STRING(8),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('profile_images', ['user_id']);
    await queryInterface.addIndex('profile_images', ['user_id', 'is_active']);
    await queryInterface.addIndex('profile_images', ['create_timestamp']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('profile_images');
  }
};
