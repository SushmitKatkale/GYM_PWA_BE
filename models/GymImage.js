const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymImage = sequelize.define('GymImage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
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
  tableName: 'gym_images',
  timestamps: false, // We're using custom timestamp fields
  hooks: {
    beforeUpdate: (gymImage) => {
      gymImage.updateTimestamp = new Date();
    }
  }
});

module.exports = GymImage;
