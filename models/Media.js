const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Media = sequelize.define('Media', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  entity_type: {
    type: DataTypes.ENUM('user_profile', 'gym', 'advertisement', 'diet_plan', 'meal', 'exercise', 'other'),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [['user_profile', 'gym', 'advertisement', 'diet_plan', 'meal', 'exercise', 'other']]
    }
  },
  entity_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1
    }
  },
  media_type: {
    type: DataTypes.ENUM('image', 'video', 'file'),
    allowNull: false,
    defaultValue: 'image'
  },
  mime_type: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
      // Removed isUrl validation as it's too strict for local URLs
    }
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'File system path for locally stored files'
  },
  alt_text: {
    type: DataTypes.STRING(150),
    allowNull: true,
    validate: {
      len: [0, 150]
    }
  },
  record_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '1=active, 0=inactive'
  },
  // Note: created_by and updated_by fields may not exist in current database schema
  // Commenting out until database schema is updated
}, {
  tableName: 'media',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No updated_at in the original schema
  underscored: true,
  indexes: [
    {
      fields: ['entity_type', 'entity_id', 'record_status'],
      name: 'idx_media_entity_status'
    },
    {
      fields: ['entity_type', 'record_status'],
      name: 'idx_media_type_status'
    },
    {
      fields: ['created_at'],
      name: 'idx_media_created_at'
    }
  ]
});

// Instance methods
Media.prototype.isActive = function () {
  return this.record_status === 1;
};

Media.prototype.deactivate = async function () {
  this.record_status = 0;
  await this.save();
  return this;
};

Media.prototype.activate = async function () {
  this.record_status = 1;
  await this.save();
  return this;
};

Media.prototype.isImage = function () {
  return this.media_type === 'image';
};

Media.prototype.isVideo = function () {
  return this.media_type === 'video';
};

Media.prototype.isFile = function () {
  return this.media_type === 'file';
};

// Static methods
Media.findByEntity = async function (entityType, entityId, options = {}) {
  const where = {
    entity_type: entityType,
    entity_id: entityId,
    record_status: options.includeInactive ? [0, 1] : 1
  };

  if (options.mediaType) {
    where.media_type = options.mediaType;
  }

  return await this.findAll({
    where,
    order: [['created_at', options.order || 'ASC']],
    limit: options.limit || null
  });
};

Media.findImagesByEntity = async function (entityType, entityId, options = {}) {
  return await this.findByEntity(entityType, entityId, {
    ...options,
    mediaType: 'image'
  });
};

Media.findVideosByEntity = async function (entityType, entityId, options = {}) {
  return await this.findByEntity(entityType, entityId, {
    ...options,
    mediaType: 'video'
  });
};

Media.findFilesByEntity = async function (entityType, entityId, options = {}) {
  return await this.findByEntity(entityType, entityId, {
    ...options,
    mediaType: 'file'
  });
};

Media.createMedia = async function (mediaData) {
  // Validate entity type and ID combination
  const validEntityTypes = ['user_profile', 'gym', 'advertisement', 'diet_plan', 'meal', 'exercise', 'other'];
  if (!validEntityTypes.includes(mediaData.entityType)) {
    throw new Error(`Invalid entity type: ${mediaData.entityType}`);
  }

  return await this.create({
    entity_type: mediaData.entityType,
    entity_id: mediaData.entityId,
    media_type: mediaData.mediaType || 'image',
    url: mediaData.url,
    location: mediaData.location,
    alt_text: mediaData.altText,
    mime_type: mediaData.mimeType
  });
};

Media.bulkCreateMedia = async function (mediaArray, options = {}) {
  const transaction = options.transaction || await sequelize.transaction();

  try {
    const mediaRecords = [];

    for (const mediaData of mediaArray) {
      const media = await this.create({
        entity_type: mediaData.entityType,
        entity_id: mediaData.entityId,
        media_type: mediaData.mediaType || 'image',
        url: mediaData.url,
        location: mediaData.location,
        alt_text: mediaData.altText
      }, { transaction });

      mediaRecords.push(media);
    }

    if (!options.transaction) {
      await transaction.commit();
    }

    return mediaRecords;

  } catch (error) {
    if (!options.transaction) {
      await transaction.rollback();
    }
    throw error;
  }
};

Media.deleteByEntity = async function (entityType, entityId, options = {}) {
  const where = {
    entity_type: entityType,
    entity_id: entityId
  };

  if (options.mediaType) {
    where.media_type = options.mediaType;
  }

  if (options.softDelete !== false) {
    // Soft delete by default
    return await this.update(
      { record_status: 0 },
      { where }
    );
  } else {
    // Hard delete if explicitly requested
    return await this.destroy({ where });
  }
};

Media.getMediaStats = async function (options = {}) {
  const where = {
    record_status: 1
  };

  if (options.entityType) {
    where.entity_type = options.entityType;
  }

  if (options.mediaType) {
    where.media_type = options.mediaType;
  }

  if (options.startDate && options.endDate) {
    where.created_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate + ' 00:00:00', options.endDate + ' 23:59:59']
    };
  }

  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_media'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN media_type = "image" THEN 1 END')), 'total_images'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN media_type = "video" THEN 1 END')), 'total_videos'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN media_type = "file" THEN 1 END')), 'total_files']
    ],
    where,
    raw: true
  });

  return stats[0];
};

Media.getMediaByType = async function (mediaType, options = {}) {
  const where = {
    media_type: mediaType,
    record_status: options.includeInactive ? [0, 1] : 1
  };

  if (options.entityType) {
    where.entity_type = options.entityType;
  }

  return await this.findAll({
    where,
    order: [['created_at', options.order || 'DESC']],
    limit: options.limit || null,
    offset: options.offset || null
  });
};

// Hook to validate entity exists before creating media
Media.addHook('beforeCreate', async (media, options) => {
  // You can add validation logic here to check if the referenced entity exists
  // For example:
  // if (media.entity_type === 'gym') {
  //   const Gym = require('./Gym');
  //   const gym = await Gym.findByPk(media.entity_id);
  //   if (!gym) throw new Error('Referenced gym does not exist');
  // }
});

module.exports = Media;
