const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const GymQRCodes = sequelize.define('GymQRCodes', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  qrCode: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'qr_code'
  },
  qrType: {
    type: DataTypes.ENUM('permanent', 'temporary', 'daily'),
    allowNull: false,
    defaultValue: 'permanent',
    field: 'qr_type'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    field: 'usage_count'
  },
  maxUsageCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    validate: {
      min: 1
    },
    field: 'max_usage_count'
  },
  qrName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Gym QR Code',
    field: 'qr_name'
  },
  qrDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Scan this QR code to check into the gym',
    field: 'qr_description'
  },
  locationName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Main Entrance',
    field: 'location_name'
  },
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    references: {
      model: 'users',
      key: 'email'
    },
    field: 'created_by'
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
  updatedBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    references: {
      model: 'users',
      key: 'email'
    },
    field: 'updated_by'
  }
}, {
  tableName: 'gym_qr_codes',
  timestamps: false,
  indexes: [
    {
      name: 'idx_gym_active_qr',
      fields: ['gym_id', 'is_active']
    },
    {
      name: 'idx_qr_lookup',
      fields: ['qr_code', 'is_active']
    },
    {
      name: 'idx_qr_expiry',
      fields: ['expires_at', 'is_active']
    },
    {
      name: 'idx_qr_type',
      fields: ['qr_type', 'is_active']
    },
    {
      name: 'idx_qr_usage',
      fields: ['usage_count', 'max_usage_count']
    }
  ],
  hooks: {
    beforeUpdate: (qrCode) => {
      qrCode.updateTimestamp = new Date();
    },
    beforeCreate: (qrCode) => {
      qrCode.createTimestamp = new Date();
      qrCode.updateTimestamp = new Date();
      
      // Generate QR code if not provided
      if (!qrCode.qrCode) {
        qrCode.qrCode = GymQRCodes.generateQRCode(qrCode.gymId);
      }
    },
    afterCreate: (qrCode) => {
      console.log(`New QR code created: ${qrCode.qrCode} for gym ${qrCode.gymId}`);
    }
  },
  validate: {
    // Ensure expiry date is in the future
    expiryInFuture() {
      if (this.expiresAt && this.expiresAt <= new Date()) {
        throw new Error('Expiry date must be in the future');
      }
    },
    
    // Ensure max usage count is valid
    maxUsageValid() {
      if (this.maxUsageCount && this.maxUsageCount <= this.usageCount) {
        throw new Error('Max usage count must be greater than current usage count');
      }
    },
    
    // Temporary QR codes must have expiry date
    temporaryMustHaveExpiry() {
      if ((this.qrType === 'temporary' || this.qrType === 'daily') && !this.expiresAt) {
        throw new Error('Temporary and daily QR codes must have an expiry date');
      }
    }
  }
});

// Static methods for QR code generation and management
GymQRCodes.generateQRCode = function(gymId, type = 'permanent') {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  
  switch (type) {
    case 'daily':
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      return `GYM_${gymId}_${date}_${random}`;
    case 'temporary':
      return `GYM_${gymId}_TEMP_${timestamp}_${random}`;
    default:
      return `GYM_${gymId}_${timestamp}_${random}`;
  }
};

GymQRCodes.createGymQRCode = async function(gymId, options = {}) {
  const {
    qrType = 'permanent',
    qrName = null,
    locationName = 'Main Entrance',
    maxUsageCount = null,
    expiresAt = null,
    createdBy = null
  } = options;

  // Set expiry for daily QR codes
  let finalExpiresAt = expiresAt;
  if (qrType === 'daily' && !expiresAt) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    finalExpiresAt = tomorrow;
  }

  const qrCode = this.generateQRCode(gymId, qrType);
  
  return await this.create({
    gymId,
    qrCode,
    qrType,
    qrName: qrName || `${qrType} QR Code`,
    locationName,
    maxUsageCount,
    expiresAt: finalExpiresAt,
    createdBy
  });
};

GymQRCodes.validateQRCode = async function(qrCode) {
  const qr = await this.findOne({
    where: {
      qrCode: qrCode,
      isActive: true
    },
    include: [
      {
        association: 'gym',
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
      }
    ]
  });

  if (!qr) {
    return { isValid: false, reason: 'QR code not found or inactive' };
  }

  // Check expiry
  if (qr.expiresAt && new Date() > qr.expiresAt) {
    return { isValid: false, reason: 'QR code has expired' };
  }

  // Check usage limit
  if (qr.maxUsageCount && qr.usageCount >= qr.maxUsageCount) {
    return { isValid: false, reason: 'QR code usage limit exceeded' };
  }

  return {
    isValid: true,
    qrCodeData: qr,
    gym: qr.gym
  };
};

GymQRCodes.incrementUsage = async function(qrCodeId) {
  const qr = await this.findByPk(qrCodeId);
  if (!qr) {
    throw new Error('QR code not found');
  }

  await qr.increment('usageCount');
  
  // Auto-deactivate if usage limit reached
  if (qr.maxUsageCount && (qr.usageCount + 1) >= qr.maxUsageCount) {
    await qr.update({ isActive: false });
  }

  return qr.reload();
};

GymQRCodes.getGymActiveQRCodes = async function(gymId) {
  return await this.findAll({
    where: {
      gymId: gymId,
      isActive: true
    },
    order: [['createTimestamp', 'DESC']]
  });
};

GymQRCodes.getExpiredQRCodes = async function() {
  return await this.findAll({
    where: {
      expiresAt: {
        [sequelize.Sequelize.Op.lte]: new Date()
      },
      isActive: true
    }
  });
};

GymQRCodes.cleanupExpiredQRCodes = async function() {
  const expiredQRs = await this.getExpiredQRCodes();
  
  if (expiredQRs.length > 0) {
    await this.update(
      { isActive: false },
      {
        where: {
          id: { [sequelize.Sequelize.Op.in]: expiredQRs.map(qr => qr.id) }
        }
      }
    );
    
    console.log(`Deactivated ${expiredQRs.length} expired QR codes`);
  }
  
  return expiredQRs.length;
};

GymQRCodes.regenerateDailyQRCodes = async function() {
  // Find all active daily QR codes
  const dailyQRs = await this.findAll({
    where: {
      qrType: 'daily',
      isActive: true
    },
    include: ['gym']
  });

  const results = [];

  for (const qr of dailyQRs) {
    // Deactivate old daily QR
    await qr.update({ isActive: false });

    // Create new daily QR for the same gym
    const newQR = await this.createGymQRCode(qr.gymId, {
      qrType: 'daily',
      qrName: qr.qrName,
      locationName: qr.locationName,
      maxUsageCount: qr.maxUsageCount,
      createdBy: qr.createdBy
    });

    results.push({
      oldQRCode: qr.qrCode,
      newQRCode: newQR.qrCode,
      gymId: qr.gymId
    });
  }

  console.log(`Regenerated ${results.length} daily QR codes`);
  return results;
};

// Instance methods
GymQRCodes.prototype.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

GymQRCodes.prototype.isUsageLimitReached = function() {
  return this.maxUsageCount && this.usageCount >= this.maxUsageCount;
};

GymQRCodes.prototype.canBeUsed = function() {
  return this.isActive && !this.isExpired() && !this.isUsageLimitReached();
};

GymQRCodes.prototype.getRemainingUsage = function() {
  if (!this.maxUsageCount) return null;
  return Math.max(0, this.maxUsageCount - this.usageCount);
};

GymQRCodes.prototype.getExpiryStatus = function() {
  if (!this.expiresAt) return 'no_expiry';
  
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);
  
  if (hoursUntilExpiry <= 0) return 'expired';
  if (hoursUntilExpiry <= 1) return 'expiring_soon';
  if (hoursUntilExpiry <= 24) return 'expiring_today';
  return 'active';
};

module.exports = GymQRCodes;
