const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSubscription = sequelize.define('UserSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    },
    field: 'user_email'
  },
  subscriptionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'id'
    },
    field: 'subscription_id'
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'payments',
      key: 'id'
    },
    field: 'payment_id'
  },
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_from'
  },
  validTo: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_to'
  },
  bufferDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'buffer_days'
  },
  activeStatus: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'active_status'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'create_timestamp'
  },
  createdBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'created_by'
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'update_timestamp'
  },
  updatedBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'user_subscriptions',
  timestamps: false,
  indexes: [
    {
      fields: ['user_email']
    },
    {
      fields: ['subscription_id']
    },
    {
      fields: ['payment_id']
    },
    {
      fields: ['valid_from', 'valid_to']
    },
    {
      fields: ['active_status']
    }
  ],
  hooks: {
    beforeUpdate: (userSubscription) => {
      userSubscription.updateTimestamp = new Date();
    }
  }
});

module.exports = UserSubscription;
