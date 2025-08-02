const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Amenity = sequelize.define('Amenity', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'amenities',
  timestamps: false, // We're using custom timestamp fields
  hooks: {
    beforeUpdate: (amenity) => {
      amenity.updateTimestamp = new Date();
    }
  }
});

module.exports = Amenity;
