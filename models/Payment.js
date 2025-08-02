const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentRefNo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'payment_ref_no'
  },
  bankRefNo: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_ref_no'
  },
  paidVia: {
    type: DataTypes.ENUM('credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cash', 'bank_transfer'),
    allowNull: false,
    field: 'paid_via'
  },
  paymentCcy: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    validate: {
      len: [3, 3]
    },
    field: 'payment_ccy'
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    field: 'payment_amount'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'transaction_id'
  },
  gatewayResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'gateway_response'
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    },
    field: 'user_email'
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
    type: DataTypes.STRING(100),
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
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'payments',
  timestamps: false,
  indexes: [
    {
      fields: ['payment_ref_no'],
      unique: true
    },
    {
      fields: ['bank_ref_no']
    },
    {
      fields: ['user_email']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['transaction_id']
    },
    {
      fields: ['create_timestamp']
    }
  ],
  hooks: {
    beforeUpdate: (payment) => {
      payment.updateTimestamp = new Date();
    }
  }
});

module.exports = Payment;
