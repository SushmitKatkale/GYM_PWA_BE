const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userEmail: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'user_email',
    references: {
      model: 'users',
      key: 'email'
    }
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_of_birth'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  height: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Height in cm'
  },
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Weight in kg'
  },
  avatarUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'avatar_url'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'user_profiles',
  timestamps: false, // Using custom timestamp fields
  underscored: true,
  hooks: {
    beforeUpdate: (userProfile) => {
      userProfile.updateTimestamp = new Date();
    }
  }
});

// Instance methods
UserProfile.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations will be defined in models/index.js
UserProfile.associate = function(models) {
  UserProfile.belongsTo(models.User, {
    foreignKey: 'userEmail',
    targetKey: 'email',
    as: 'user'
  });
};

module.exports = UserProfile;
