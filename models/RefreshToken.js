const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
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
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_revoked'
  },
  deviceInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'device_info',
    comment: 'JSON string containing device information'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  recordStatus: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'record_status',
    comment: '0=deleted, 1=active'
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
  tableName: 'refresh_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['token']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['user_id', 'is_revoked', 'record_status']
    }
  ]
});

// Instance methods
RefreshToken.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

RefreshToken.prototype.isValid = function() {
  return !this.isRevoked && !this.isExpired() && this.recordStatus === 1;
};

// Static methods
RefreshToken.findValidToken = async function(token) {
  const refreshToken = await this.findOne({
    where: {
      token,
      isRevoked: false,
      recordStatus: 1
    },
    include: [{
      model: sequelize.models.User,
      as: 'user',
      attributes: ['id', 'email', 'role', 'recordStatus']
    }]
  });

  if (!refreshToken || refreshToken.isExpired()) {
    return null;
  }

  return refreshToken;
};

RefreshToken.revokeToken = async function(token) {
  return await this.update(
    { isRevoked: true },
    { where: { token } }
  );
};

RefreshToken.revokeAllUserTokens = async function(userId) {
  return await this.update(
    { isRevoked: true },
    { where: { userId, isRevoked: false } }
  );
};

RefreshToken.cleanupExpiredTokens = async function() {
  return await this.update(
    { recordStatus: 0 },
    { 
      where: {
        expiresAt: {
          [sequelize.Op.lt]: new Date()
        },
        recordStatus: 1
      }
    }
  );
};

module.exports = RefreshToken;
