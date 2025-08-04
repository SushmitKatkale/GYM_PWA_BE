const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPrivacySettings = sequelize.define('UserPrivacySettings', {
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
  profileVisibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    allowNull: false,
    defaultValue: 'private',
    field: 'profile_visibility'
  },
  shareWorkoutData: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'share_workout_data'
  },
  shareProgressPhotos: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'share_progress_photos'
  },
  allowFriendRequests: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'allow_friend_requests'
  },
  showOnlineStatus: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'show_online_status'
  },
  allowSearchByEmail: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'allow_search_by_email'
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
  tableName: 'user_privacy_settings',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (settings) => {
      settings.updateTimestamp = new Date();
    }
  }
});

// Instance methods
UserPrivacySettings.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations
UserPrivacySettings.associate = function(models) {
  UserPrivacySettings.belongsTo(models.User, {
    foreignKey: 'userEmail',
    targetKey: 'email',
    as: 'user'
  });
};

module.exports = UserPrivacySettings;
