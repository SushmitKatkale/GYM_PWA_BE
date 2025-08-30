const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdvertisementAnalytics = sequelize.define('AdvertisementAnalytics', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    defaultValue: () => `ANALYTICS${Date.now()}${Math.floor(Math.random() * 1000)}`,
  },
  advertisementId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'advertisement_id',
    references: {
      model: 'advertisements',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'user_id',
    comment: 'User ID if logged in, null for anonymous users'
  },
  eventType: {
    type: DataTypes.ENUM('view', 'click', 'close', 'share'),
    allowNull: false,
    field: 'event_type'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    validate: {
      isIP: {
        msg: 'Invalid IP address format'
      }
    }
  },
  locationData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'location_data',
    comment: 'Geographic location data including country, city, etc.'
  },
  deviceType: {
    type: DataTypes.ENUM('mobile', 'desktop', 'tablet'),
    allowNull: true,
    field: 'device_type'
  },
  browserType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'browser_type'
  },
  osType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'os_type'
  },
  referrerUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'referrer_url'
  },
  sessionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'session_id',
    comment: 'Session identifier for tracking user sessions'
  },
  viewDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'view_duration',
    comment: 'Duration in seconds for view events'
  },
  eventTimestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'event_timestamp'
  },
  createdBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'created_by',
    comment: 'User ID who created this record'
  },
  updatedBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'updated_by',
    comment: 'User ID who last updated this record'
  },
  recordStatus: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'record_status',
    comment: '1=active, 0=inactive'
  },
  createdBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'created_by',
    comment: 'User ID who created this record'
  },
  updatedBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'updated_by',
    comment: 'User ID who last updated this record'
  }
}, {
  tableName: 'advertisement_analytics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['advertisement_id']
    },
    {
      fields: ['event_type']
    },
    {
      fields: ['event_timestamp']
    },
    {
      fields: ['advertisement_id', 'event_type']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['device_type']
    }
  ]
});

module.exports = AdvertisementAnalytics;
