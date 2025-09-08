const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
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
  gymId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'gym_id',
    references: {
      model: 'gyms',
      key: 'id'
    }
  },
  subscriptionId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'subscription_id',
    references: {
      model: 'subscriptions',
      key: 'id'
    }
  },
  isBuffer: {
    type: DataTypes.TINYINT,
    allowNull: false,
    field: 'is_buffer',
    defaultValue: 0,
    comment: '1-true,0-false'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '0=pending,1=success,2=failed'
  },
  gateway: {
    type: DataTypes.ENUM('razorpay', 'phonepe', 'stripe'),
    allowNull: false
  },
  paymentRefNo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'payment_ref_no'
  },
  commissionPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'commission_percent'
  },
  gstPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'gst_percent'
  },
  gatewayResponse: {
    type: DataTypes.STRING(2500),
    allowNull: true,
    field: 'gateway_response'
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
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = Payment;
