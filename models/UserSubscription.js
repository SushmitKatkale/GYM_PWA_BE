const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSubscription = sequelize.define('UserSubscription', {
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
  subscriptionId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'subscription_id',
    references: {
      model: 'subscriptions',
      key: 'id'
    }
  },
  paymentId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'payment_id',
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date'
  },
  bufferApplied: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    field: 'buffer_applied',
    comment: '1=buffer purchased, 0=no buffer'
  },
  bufferStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'buffer_start_date'
  },
  bufferEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'buffer_end_date'
  },
  bufferFeePaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'buffer_fee_paid'
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
  tableName: 'user_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods
UserSubscription.prototype.isActive = function () {
  const today = new Date();
  const endDate = new Date(this.endDate);

  if (this.bufferApplied && this.bufferEndDate) {
    const bufferEndDate = new Date(this.bufferEndDate);
    return today <= bufferEndDate;
  }

  return today <= endDate;
};

UserSubscription.prototype.isInBufferPeriod = function () {
  if (!this.bufferApplied || !this.bufferStartDate || !this.bufferEndDate) {
    return false;
  }

  const today = new Date();
  const bufferStart = new Date(this.bufferStartDate);
  const bufferEnd = new Date(this.bufferEndDate);

  return today >= bufferStart && today <= bufferEnd;
};

UserSubscription.prototype.getDaysRemaining = function () {
  const today = new Date();
  let targetEndDate;

  if (this.bufferApplied && this.bufferEndDate) {
    targetEndDate = new Date(this.bufferEndDate);
  } else {
    targetEndDate = new Date(this.endDate);
  }

  const diffTime = targetEndDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

UserSubscription.prototype.isExpired = function () {
  return this.getDaysRemaining() === 0;
};

module.exports = UserSubscription;
