const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmergencyContact = sequelize.define('EmergencyContact', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userEmail: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'user_email',
    references: {
      model: 'users',
      key: 'email'
    }
  },
  contactName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'contact_name',
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'contact_phone',
    validate: {
      is: /^[+]?[0-9\s\-\(\)]+$/
    }
  },
  relationship: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50],
      notEmpty: true
    }
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_primary'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'create_timestamp'
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'update_timestamp'
  }
}, {
  tableName: 'emergency_contacts',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (emergencyContact) => {
      emergencyContact.updateTimestamp = new Date();
    }
  }
});

// Instance methods
EmergencyContact.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations
EmergencyContact.associate = function(models) {
  EmergencyContact.belongsTo(models.User, {
    foreignKey: 'userEmail',
    targetKey: 'email',
    as: 'user'
  });
};

module.exports = EmergencyContact;
