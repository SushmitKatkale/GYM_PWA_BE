const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Gym = sequelize.define('Gym', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  openingTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  closingTime: {
    type: DataTypes.TIME,
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
  },
  ownerId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0,
      max: 5
    }
  },
  currentOccupancy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  }
}, {
  tableName: 'gyms',
  timestamps: false, // We're using custom timestamp fields
  hooks: {
    beforeUpdate: (gym) => {
      gym.updateTimestamp = new Date();
    }
  }
});

module.exports = Gym;
