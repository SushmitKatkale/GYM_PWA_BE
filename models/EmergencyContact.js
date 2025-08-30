const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmergencyContact = sequelize.define('EmergencyContact', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [2, 100]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[+]?[0-9\s\-\(\)]+$/
    }
  },
  relation: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      len: [2, 50]
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
  tableName: 'emergency_contacts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods
EmergencyContact.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations
EmergencyContact.associate = function(models) {
  EmergencyContact.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = EmergencyContact;
