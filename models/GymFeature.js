const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymFeature = sequelize.define('GymFeature', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
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
  featureId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'feature_id',
    references: {
      model: 'features',
      key: 'id'
    }
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
  tableName: 'gym_features',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['gym_id', 'feature_id']
    }
  ]
});

module.exports = GymFeature;
