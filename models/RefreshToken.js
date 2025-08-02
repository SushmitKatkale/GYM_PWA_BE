const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Only track creation time
});

// Instance methods
RefreshToken.prototype.isExpired = function() {
  return new Date() > new Date(this.expiresAt);
};

// Class methods
RefreshToken.findByToken = async function(token) {
  return await this.findOne({ where: { token } });
};

RefreshToken.findByUserId = async function(userId) {
  return await this.findAll({ where: { userId } });
};

RefreshToken.deleteByUserId = async function(userId) {
  return await this.destroy({ where: { userId } });
};

RefreshToken.deleteExpired = async function() {
  return await this.destroy({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
    },
  });
};

RefreshToken.createToken = async function(userId, token, expirationDate) {
  return await this.create({
    userId,
    token,
    expiresAt: expirationDate,
  });
};

module.exports = RefreshToken;
