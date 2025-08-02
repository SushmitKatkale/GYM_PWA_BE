const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SubscriptionFeature = sequelize.define('SubscriptionFeature', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  subscriptionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  isHighlighted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  activeStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  createTimestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'subscription_features',
  timestamps: false, // We're using custom timestamp fields
  hooks: {
    beforeUpdate: (feature) => {
      feature.updateTimestamp = new Date();
    }
  }
});

module.exports = SubscriptionFeature;
