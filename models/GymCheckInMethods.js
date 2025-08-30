const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymCheckInMethods = sequelize.define('GymCheckInMethods', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  gymId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'gym_id',
    references: {
      model: 'gyms',
      key: 'id'
    }
  },
  methodId: {
    type: DataTypes.TINYINT,
    allowNull: false,
    field: 'method_id',
    references: {
      model: 'checkin_methods',
      key: 'id'
    }
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
  tableName: 'gym_checkin_methods',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['gym_id', 'method_id']
    }
  ]
});

// Static methods for common queries
GymCheckInMethods.getGymMethods = async function(gymId) {
  return await this.findAll({
    where: { gymId },
    include: [{
      association: 'method',
      attributes: ['id', 'name', 'description']
    }]
  });
};

GymCheckInMethods.enableMethodForGym = async function(gymId, methodId) {
  return await this.findOrCreate({
    where: { gymId, methodId },
    defaults: { gymId, methodId }
  });
};

GymCheckInMethods.disableMethodForGym = async function(gymId, methodId) {
  return await this.destroy({
    where: { gymId, methodId }
  });
};

// Associations will be defined in models/index.js
GymCheckInMethods.associate = function(models) {
  // Belongs to Gym
  GymCheckInMethods.belongsTo(models.Gym, {
    foreignKey: 'gymId',
    as: 'gym'
  });

  // Belongs to CheckInMethod
  GymCheckInMethods.belongsTo(models.CheckInMethod, {
    foreignKey: 'methodId',
    as: 'method'
  });
};

module.exports = GymCheckInMethods;
