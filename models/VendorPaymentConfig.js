const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VendorPaymentConfig = sequelize.define('VendorPaymentConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ownerEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    },
    field: 'owner_email'
  },
  gymId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gyms',
      key: 'id'
    },
    field: 'gym_id'
  },
  razorpayVendorId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'razorpay_vendor_id'
  },
  cutValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    field: 'cut_value'
  },
  cutType: {
    type: DataTypes.ENUM('percentage', 'flat'),
    allowNull: false,
    defaultValue: 'percentage',
    field: 'cut_type'
  },
  isRazorpayActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_razorpay_active'
  },
  onboardingStatus: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'onboarding_status'
  },
  onboardingDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'onboarding_date'
  },
  bankAccountVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'bank_account_verified'
  },
  kycStatus: {
    type: DataTypes.ENUM('pending', 'submitted', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'kyc_status'
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
  tableName: 'vendor_payment_configs',
  timestamps: false,
  indexes: [
    {
      fields: ['owner_email']
    },
    {
      fields: ['gym_id']
    },
    {
      fields: ['razorpay_vendor_id']
    },
    {
      fields: ['onboarding_status']
    },
    {
      fields: ['owner_email', 'gym_id'],
      unique: true,
      name: 'unique_owner_gym'
    }
  ],
  hooks: {
    beforeUpdate: (vendorConfig) => {
      vendorConfig.updateTimestamp = new Date();
    }
  }
});

module.exports = VendorPaymentConfig;
