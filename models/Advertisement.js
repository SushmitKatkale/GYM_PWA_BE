const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Advertisement = sequelize.define('Advertisement', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    defaultValue: () => `AD${Date.now()}${Math.floor(Math.random() * 1000)}`,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  adType: {
    type: DataTypes.ENUM('banner', 'popup', 'card', 'video', 'carousel'),
    allowNull: false,
    field: 'ad_type'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'draft', 'expired'),
    defaultValue: 'draft',
    allowNull: false,
  },
  targetAudience: {
    type: DataTypes.ENUM('all', 'members', 'gym_owners', 'specific_gyms', 'location_based'),
    defaultValue: 'all',
    allowNull: false,
    field: 'target_audience'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 10
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date',
    validate: {
      isAfterStart(value) {
        if (value && this.startDate && new Date(value) <= new Date(this.startDate)) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  createdBy: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'created_by'
  },
  updatedBy: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'updated_by'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'create_timestamp'
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'update_timestamp'
  }
}, {
  tableName: 'advertisements',
  timestamps: false,
  hooks: {
    beforeUpdate: (advertisement) => {
      advertisement.updateTimestamp = new Date();
    }
  },
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['ad_type']
    },
    {
      fields: ['start_date', 'end_date']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['create_timestamp']
    }
  ]
});

module.exports = Advertisement;
