const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('system', 'promo', 'reminder'),
    allowNull: false,
    defaultValue: 'system'
  },
  isRead: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    field: 'is_read'
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
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

// Instance methods
Notification.prototype.toJSON = function () {
  const values = { ...this.get() };
  return values;
};

Notification.prototype.markAsRead = function () {
  this.isRead = 1;
  return this.save();
};

// Static methods
Notification.findForUser = async function (userId, options = {}) {
  const where = { userId };

  if (options.onlyUnread) {
    where.isRead = 0;
  }

  if (options.type) {
    where.type = options.type;
  }

  return await this.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: options.limit || 50,
    offset: options.offset || 0
  });
};

Notification.getUnreadCount = async function (userId) {
  return await this.count({
    where: {
      userId,
      isRead: 0
    }
  });
};

Notification.markAllAsReadForUser = async function (userId) {
  return await this.update(
    { isRead: 1 },
    { where: { userId, isRead: 0 } }
  );
};

// Associations
Notification.associate = function (models) {
  Notification.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = Notification;
