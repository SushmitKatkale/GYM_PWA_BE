const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
    field: 'id'
  },
  userEmail: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'user_email',
    references: {
      model: 'users',
      key: 'email'
    }
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'endpoint'
  },
  p256dhKey: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'p256dh_key'
  },
  authKey: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'auth_key'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  deviceType: {
    type: DataTypes.ENUM('desktop', 'mobile', 'tablet'),
    allowNull: true,
    defaultValue: 'desktop',
    field: 'device_type'
  },
  platform: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'platform'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  lastUsed: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_used'
  },
  subscriptionData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'subscription_data'
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
  tableName: 'push_subscriptions',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['user_email', 'is_active']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['create_timestamp']
    },
    {
      unique: true,
      fields: ['user_email', { name: 'endpoint', length: 255 }]
    }
  ],
  hooks: {
    beforeCreate: (subscription) => {
      // Generate unique ID if not provided
      if (!subscription.id) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        subscription.id = result;
      }
      
      // Set last used to now
      subscription.lastUsed = new Date();
      
      // Extract device info from user agent if provided
      if (subscription.userAgent) {
        const ua = subscription.userAgent.toLowerCase();
        if (ua.includes('mobile')) {
          subscription.deviceType = 'mobile';
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
          subscription.deviceType = 'tablet';
        } else {
          subscription.deviceType = 'desktop';
        }
        
        // Extract platform
        if (ua.includes('chrome')) {
          subscription.platform = 'Chrome';
        } else if (ua.includes('firefox')) {
          subscription.platform = 'Firefox';
        } else if (ua.includes('safari')) {
          subscription.platform = 'Safari';
        } else if (ua.includes('edge')) {
          subscription.platform = 'Edge';
        } else {
          subscription.platform = 'Other';
        }
      }
    },
    beforeUpdate: (subscription) => {
      subscription.updateTimestamp = new Date();
    }
  }
});

// Instance methods
PushSubscription.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

PushSubscription.prototype.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

PushSubscription.prototype.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Static methods
PushSubscription.findActiveByUser = async function(userEmail) {
  return await this.findAll({
    where: {
      userEmail,
      isActive: true
    },
    order: [['lastUsed', 'DESC']]
  });
};

PushSubscription.findByEndpoint = async function(endpoint) {
  return await this.findOne({
    where: { endpoint }
  });
};

PushSubscription.cleanupInactiveSubscriptions = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await this.destroy({
    where: {
      isActive: false,
      updateTimestamp: {
        [sequelize.Sequelize.Op.lt]: cutoffDate
      }
    }
  });
  
  return result;
};

// Associations
PushSubscription.associate = function(models) {
  PushSubscription.belongsTo(models.User, {
    foreignKey: 'userEmail',
    targetKey: 'email',
    as: 'user'
  });
};

module.exports = PushSubscription;
