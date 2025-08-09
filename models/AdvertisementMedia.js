const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdvertisementMedia = sequelize.define('AdvertisementMedia', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    defaultValue: () => `MEDIA${Date.now()}${Math.floor(Math.random() * 1000)}`,
  },
  advertisementId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'advertisement_id',
    references: {
      model: 'advertisements',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  mediaType: {
    type: DataTypes.ENUM('image', 'video', 'gif'),
    allowNull: false,
    field: 'media_type'
  },
  mediaUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'media_url',
    validate: {
      notEmpty: true,
      isValidUrl(value) {
        // Custom URL validation that accepts localhost and standard URLs
        const urlPattern = /^(https?:\/\/)([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(:[0-9]+)?(\/.*)?(\?.*)?$/;
        const localhostPattern = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:[0-9]+)?(\/.*)?(\?.*)?$/;
        
        if (!urlPattern.test(value) && !localhostPattern.test(value)) {
          throw new Error('Media URL must be a valid URL');
        }
      }
    }
  },
  mediaAltText: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'media_alt_text'
  },
  mediaOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'media_order',
    validate: {
      min: 0
    }
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
    comment: 'File size in bytes'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'mime_type'
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds for videos'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'create_timestamp'
  }
}, {
  tableName: 'advertisement_media',
  timestamps: false,
  indexes: [
    {
      fields: ['advertisement_id']
    },
    {
      fields: ['media_type']
    },
    {
      fields: ['advertisement_id', 'media_order']
    }
  ]
});

module.exports = AdvertisementMedia;
