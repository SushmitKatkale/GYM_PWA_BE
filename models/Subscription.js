const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
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
  validityDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  discountedPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  gymId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gyms',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  isMostPopular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  isCheapest: {
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
  tableName: 'subscriptions',
  timestamps: false, // We're using custom timestamp fields
  hooks: {
    beforeUpdate: (subscription) => {
      subscription.updateTimestamp = new Date();
    }
  }
});

module.exports = Subscription;
