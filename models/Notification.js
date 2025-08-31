const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'promotion', 'reminder'),
    allowNull: false,
    defaultValue: 'info'
  },
  category: {
    type: DataTypes.ENUM('subscription', 'class', 'workout', 'payment', 'system', 'promotion', 'reminder', 'security'),
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  recipientEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'recipient_email'
  },
  recipientRole: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'recipient_role'
  },
  recipient_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  senderEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sender_email'
  },
  sender_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isGlobal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_global'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read'
  },
  gymId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'gym_id'
  },
  actionUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'action_url'
  },
  actionText: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'action_text'
  },
  iconUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'icon_url'
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'image_url'
  },
  deliveryChannels: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['push'],
    field: 'delivery_channels'
  },
  deliveryStatus: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'delivery_status'
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_for'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  recordStatus: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'record_status',
    comment: '1=active, 0=inactive'
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
  // Add createTimestamp alias for frontend compatibility
  if (values.created_at && !values.createTimestamp) {
    values.createTimestamp = values.created_at;
  }
  return values;
};

Notification.prototype.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

Notification.prototype.updateDeliveryStatus = function (channel, status) {
  const currentStatus = this.deliveryStatus || {};
  currentStatus[channel] = {
    status,
    timestamp: new Date().toISOString()
  };
  this.deliveryStatus = currentStatus;
  return this.save();
};

// Static methods
Notification.findForUser = async function (userId, userEmail, options = {}) {
  const { Op } = require('sequelize');
  
  const where = {
    [Op.or]: [
      { recipient_id: userId },
      { recipientEmail: userEmail },
      { isGlobal: true }
    ],
    expiresAt: {
      [Op.or]: [
        { [Op.gt]: new Date() },
        { [Op.is]: null }
      ]
    }
  };

  if (options.onlyUnread) {
    where.isRead = false;
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.category) {
    where.category = options.category;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: options.limit || 50,
    offset: options.offset || 0
  });
};

Notification.getUnreadCount = async function (userId, userEmail) {
  const { Op } = require('sequelize');
  
  return await this.count({
    where: {
      [Op.or]: [
        { recipient_id: userId },
        { recipientEmail: userEmail },
        { isGlobal: true }
      ],
      isRead: false,
      expiresAt: {
        [Op.or]: [
          { [Op.gt]: new Date() },
          { [Op.is]: null }
        ]
      }
    }
  });
};

Notification.markAllAsReadForUser = async function (userId, userEmail) {
  const { Op } = require('sequelize');
  
  return await this.update(
    { isRead: true },
    { 
      where: {
        [Op.or]: [
          { recipient_id: userId },
          { recipientEmail: userEmail },
          { isGlobal: true }
        ],
        isRead: false
      }
    }
  );
};

Notification.cleanupExpiredNotifications = async function () {
  const { Op } = require('sequelize');
  
  const deletedCount = await this.destroy({
    where: {
      expiresAt: {
        [Op.lt]: new Date()
      }
    }
  });
  
  return deletedCount;
};

// Associations are defined in models/index.js to avoid conflicts

module.exports = Notification;
