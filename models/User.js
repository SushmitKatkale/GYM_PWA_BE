const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name',
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name',
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      len: [3, 100]
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password',
    validate: {
      len: [8, 255]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: {
      is: /^[+]?[0-9\s\-\(\)]+$/
    }
  },
  role: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '1=member,2=owner,3=trainer,4=admin',
    validate: {
      isIn: [[1, 2, 3, 4]]
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
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      // Hash password
      if (user.password) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if changed
      if (user.changed('password')) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    }
  }
});

// Instance methods
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Role helper methods
User.prototype.isMember = function() {
  return this.role === 1;
};

User.prototype.isOwner = function() {
  return this.role === 2;
};

User.prototype.isTrainer = function() {
  return this.role === 3;
};

User.prototype.isAdmin = function() {
  return this.role === 4;
};

User.prototype.hasRole = function(roles) {
  return Array.isArray(roles) ? roles.includes(this.role) : this.role === roles;
};

// Associations will be defined in models/index.js
User.associate = function(models) {
  // User Profile (One-to-One)
  User.hasOne(models.UserProfile, {
    foreignKey: 'userId',
    as: 'profile',
    onDelete: 'CASCADE'
  });

  // Emergency Contacts (One-to-Many)
  User.hasMany(models.EmergencyContact, {
    foreignKey: 'userId',
    as: 'emergencyContacts',
    onDelete: 'CASCADE'
  });

  // Owned Gyms (Owner role)
  User.hasMany(models.Gym, {
    foreignKey: 'ownerId',
    as: 'ownedGyms',
    onDelete: 'CASCADE'
  });

  // User Subscriptions
  User.hasMany(models.UserSubscription, {
    foreignKey: 'userId',
    as: 'subscriptions',
    onDelete: 'CASCADE'
  });

  // Attendances
  User.hasMany(models.Attendance, {
    foreignKey: 'userId',
    as: 'attendances',
    onDelete: 'CASCADE'
  });

  // Payments
  User.hasMany(models.Payment, {
    foreignKey: 'userId',
    as: 'payments',
    onDelete: 'CASCADE'
  });

  // Notifications
  User.hasMany(models.Notification, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE'
  });

  // Push Subscriptions
  User.hasMany(models.PushSubscription, {
    foreignKey: 'userId',
    as: 'pushSubscriptions',
    onDelete: 'CASCADE'
  });

  // Fitness Goals (Many-to-Many)
  User.belongsToMany(models.FitnessGoal, {
    through: models.UserFitnessGoal,
    foreignKey: 'userId',
    otherKey: 'goalId',
    as: 'fitnessGoals'
  });
};

// Class methods
User.findByEmail = async function(email) {
  return await this.findOne({ where: { email } });
};

User.findByUsername = async function(username) {
  return await this.findOne({ where: { username } });
};

User.findByPhone = async function(phone) {
  return await this.findOne({ where: { phone } });
};

User.findAllWithPagination = async function(limit = 50, offset = 0) {
  return await this.findAndCountAll({
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['password'] }
  });
};

module.exports = User;
