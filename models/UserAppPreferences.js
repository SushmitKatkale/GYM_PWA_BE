const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserAppPreferences = sequelize.define('UserAppPreferences', {
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
  darkMode: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'dark_mode'
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en'
  },
  units: {
    type: DataTypes.ENUM('metric', 'imperial'),
    allowNull: false,
    defaultValue: 'metric'
  },
  autoSync: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'auto_sync'
  },
  offlineMode: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'offline_mode'
  },
  dataUsage: {
    type: DataTypes.ENUM('low', 'normal', 'high'),
    allowNull: false,
    defaultValue: 'normal',
    field: 'data_usage'
  },
  animationsEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'animations_enabled'
  },
  soundEffects: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'sound_effects'
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'UTC'
  },
  dateFormat: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'DD/MM/YYYY',
    field: 'date_format'
  },
  timeFormat: {
    type: DataTypes.ENUM('12h', '24h'),
    allowNull: false,
    defaultValue: '24h',
    field: 'time_format'
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
  tableName: 'user_app_preferences',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (preferences) => {
      preferences.updateTimestamp = new Date();
    }
  }
});

// Instance methods
UserAppPreferences.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations
UserAppPreferences.associate = function(models) {
  UserAppPreferences.belongsTo(models.User, {
    foreignKey: 'userEmail',
    targetKey: 'email',
    as: 'user'
  });
};

module.exports = UserAppPreferences;
