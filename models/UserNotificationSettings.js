const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserNotificationSettings = sequelize.define('UserNotificationSettings', {
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
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'email_notifications'
  },
  pushNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'push_notifications'
  },
  smsNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'sms_notifications'
  },
  subscriptionReminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'subscription_reminders'
  },
  classReminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'class_reminders'
  },
  promotionalEmails: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'promotional_emails'
  },
  workoutReminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'workout_reminders'
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
  tableName: 'user_notification_settings',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (settings) => {
      settings.updateTimestamp = new Date();
    }
  }
});

// Instance methods
UserNotificationSettings.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations
UserNotificationSettings.associate = function(models) {
  UserNotificationSettings.belongsTo(models.User, {
    foreignKey: 'userEmail',
    targetKey: 'email',
    as: 'user'
  });
};

module.exports = UserNotificationSettings;
