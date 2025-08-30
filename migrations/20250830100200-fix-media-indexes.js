'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the old restrictive unique index
    try {
      await queryInterface.removeIndex('media', 'unique_active_media_per_entity');
      console.log('✅ Removed old restrictive unique index');
    } catch (error) {
      console.log('⚠️ Old index might not exist or already removed:', error.message);
    }

    // Create new unique index only for user_profile entities
    await queryInterface.addIndex('media', {
      unique: true,
      fields: ['entity_type', 'entity_id'],
      where: {
        entity_type: 'user_profile',
        record_status: 1
      },
      name: 'unique_active_user_profile_media'
    });

    // Create performance indexes
    await queryInterface.addIndex('media', {
      fields: ['entity_type', 'entity_id', 'record_status'],
      name: 'idx_media_entity_status'
    });

    await queryInterface.addIndex('media', {
      fields: ['entity_type', 'record_status'],
      name: 'idx_media_type_status'
    });

    await queryInterface.addIndex('media', {
      fields: ['created_at'],
      name: 'idx_media_created_at'
    });

    console.log('✅ Created new indexes for Media table');
  },

  async down(queryInterface, Sequelize) {
    // Remove the new indexes
    try {
      await queryInterface.removeIndex('media', 'unique_active_user_profile_media');
      await queryInterface.removeIndex('media', 'idx_media_entity_status');
      await queryInterface.removeIndex('media', 'idx_media_type_status');
      await queryInterface.removeIndex('media', 'idx_media_created_at');
    } catch (error) {
      console.log('⚠️ Some indexes might not exist:', error.message);
    }

    // Recreate the old restrictive unique index
    await queryInterface.addIndex('media', {
      unique: true,
      fields: ['entity_type', 'entity_id', 'record_status'],
      where: {
        entity_type: 'user_profile',
        record_status: 1
      },
      name: 'unique_active_media_per_entity'
    });

    console.log('✅ Restored old Media table indexes');
  }
};
