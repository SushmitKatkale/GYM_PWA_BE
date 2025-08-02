const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper function to generate unique alphanumeric ID
const generateUniqueId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  id: {
    type: DataTypes.STRING(8),
    allowNull: true, // Allow null initially, will be generated in hook
    unique: true,
    validate: {
      len: [8, 8],
      isAlphanumeric: true
    }
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'first_name',
    validate: {
      len: [2, 50],
      notEmpty: true,
    },
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'last_name',
    validate: {
      len: [2, 50],
      notEmpty: true,
    },
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [8, 255],
    },
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'phone_number',
    validate: {
      is: /^[+]?[0-9\s\-\(\)]+$/,
    },
  },
  type: {
    type: DataTypes.ENUM('1', '2', '3'),
    allowNull: false,
    defaultValue: '1',
    comment: '1-user, 2-owner, 3-admin',
    validate: {
      isIn: [['1', '2', '3']],
    },
  },
  activeStatus: {
    type: DataTypes.ENUM('0', '1'),
    allowNull: false,
    defaultValue: '1',
    field: 'active_status',
    validate: {
      isIn: [['0', '1']],
    },
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified',
    comment: 'Whether the user has verified their email address'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'create_timestamp',
  },
  createdBy: {
    type: DataTypes.STRING(8),
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'update_timestamp',
  },
  updatedBy: {
    type: DataTypes.STRING(8),
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'users',
  timestamps: false, // We're using custom timestamp fields
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      // Generate unique ID if not provided
      if (!user.id) {
        let uniqueId;
        let isUnique = false;
        while (!isUnique) {
          uniqueId = generateUniqueId();
          const existingUser = await User.findOne({ where: { id: uniqueId } });
          if (!existingUser) {
            isUnique = true;
          }
        }
        user.id = uniqueId;
      }
      
      // Hash password
      if (user.password) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
      
      // Set timestamps
      user.createTimestamp = new Date();
      user.updateTimestamp = new Date();
    },
    beforeUpdate: async (user) => {
      // Hash password if changed
      if (user.changed('password')) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
      
      // Update timestamp
      user.updateTimestamp = new Date();
    },
  },
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

// Self-referencing associations (will be defined in models/index.js)
User.associate = function(models) {
  // User who created this record
  User.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator',
    constraints: false
  });
  
  // User who last updated this record
  User.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater',
    constraints: false
  });
};

// Class methods
User.findByEmail = async function(email) {
  return await this.findOne({ where: { email, activeStatus: '1' } });
};

User.findByUsername = async function(username) {
  return await this.findOne({ where: { username, activeStatus: '1' } });
};

User.findAllWithPagination = async function(limit = 50, offset = 0) {
  return await this.findAndCountAll({
    limit,
    offset,
    order: [['createTimestamp', 'DESC']],
    attributes: { exclude: ['password'] },
  });
};

module.exports = User;
