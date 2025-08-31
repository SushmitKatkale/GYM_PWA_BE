const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserNotificationSettings = sequelize.define('UserNotificationSettings', {
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
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'user_email',
    unique: true
  },
  pushNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'push_notifications'
  },
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'email_notifications'
  },
  smsNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'sms_notifications'
  },
  promotionalEmails: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'promotional_emails'
  },
  systemNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'system_notifications'
  },
  securityNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'security_notifications'
  },
  workoutReminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'workout_reminders'
  },
  paymentReminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'payment_reminders'
  },
  subscriptionUpdates: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'subscription_updates'
  },
  quietHoursStart: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'quiet_hours_start'
  },
  quietHoursEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'quiet_hours_end'
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'UTC'
  }
}, {
  tableName: 'user_notification_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

// Instance methods
UserNotificationSettings.prototype.toJSON = function () {
  const values = { ...this.get() };
  return values;
};

// Static methods
UserNotificationSettings.createDefault = async function (userId, userEmail) {
  return await this.create({
    userId,
    userEmail,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    promotionalEmails: true,
    systemNotifications: true,
    securityNotifications: true,
    workoutReminders: true,
    paymentReminders: true,
    subscriptionUpdates: true
  });
};

UserNotificationSettings.getByUserEmail = async function (userEmail) {
  return await this.findOne({
    where: { userEmail }
  });
};

UserNotificationSettings.updateSettings = async function (userEmail, settings) {
  const [affectedRows] = await this.update(settings, {
    where: { userEmail }
  });
  
  if (affectedRows === 0) {
    // If no rows were updated, the settings don't exist yet - create them
    const user = require('./User');
    const userData = await user.findOne({ where: { email: userEmail } });
    if (userData) {
      return await this.create({
        userId: userData.id,
        userEmail,
        ...settings
      });
    }
  }
  
  return await this.getByUserEmail(userEmail);
};

module.exports = UserNotificationSettings;
