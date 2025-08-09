const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Refund = sequelize.define('Refund', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'payments',
      key: 'id'
    },
    field: 'payment_id'
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    },
    references: {
      model: 'users',
      key: 'email'
    },
    field: 'user_email'
  },
  subscriptionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'user_subscriptions',
      key: 'id'
    },
    field: 'subscription_id'
  },
  originalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    field: 'original_amount'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    field: 'refund_amount'
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refund_reason'
  },
  refundType: {
    type: DataTypes.ENUM('full', 'partial'),
    allowNull: false,
    defaultValue: 'full',
    field: 'refund_type'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  refundId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'refund_id',
    comment: 'Gateway refund ID (Razorpay/PhonePe)'
  },
  gatewayRefundId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'gateway_refund_id'
  },
  gatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'gateway_response'
  },
  paymentGateway: {
    type: DataTypes.ENUM('razorpay', 'phonepe'),
    allowNull: false,
    field: 'payment_gateway'
  },
  processedBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'processed_by',
    comment: 'Email of admin who processed the refund'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Admin notes or additional information'
  },
  activeStatus: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'active_status'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'create_timestamp'
  },
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'created_by'
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'update_timestamp'
  },
  updatedBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'refunds',
  timestamps: false,
  indexes: [
    {
      fields: ['payment_id']
    },
    {
      fields: ['user_email']
    },
    {
      fields: ['status']
    },
    {
      fields: ['refund_id'],
      unique: true,
      where: {
        refund_id: {
          [Op.ne]: null
        }
      }
    },
    {
      fields: ['create_timestamp']
    }
  ],
  hooks: {
    beforeUpdate: (refund) => {
      refund.updateTimestamp = new Date();
    }
  }
});

module.exports = Refund;
