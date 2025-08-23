const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const GymUniqueCodes = sequelize.define('GymUniqueCodes', {
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
  uniqueCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      len: [4, 10],
      isAlphanumeric: true
    },
    field: 'unique_code'
  },
  codeType: {
    type: DataTypes.ENUM('permanent', 'daily', 'weekly', 'monthly'),
    allowNull: false,
    defaultValue: 'permanent',
    field: 'code_type'
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
  codeName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Gym Access Code',
    field: 'code_name'
  },
  codeDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Enter this code to check into the gym',
    field: 'code_description'
  },
  autoRegenerate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_regenerate'
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
  tableName: 'gym_unique_codes',
  timestamps: false,
  indexes: [
    {
      name: 'idx_gym_active_codes',
      fields: ['gym_id', 'is_active']
    },
    {
      name: 'idx_code_lookup',
      fields: ['unique_code', 'is_active']
    },
    {
      name: 'idx_code_expiry',
      fields: ['expires_at', 'is_active']
    },
    {
      name: 'idx_code_type',
      fields: ['code_type', 'is_active']
    },
    {
      name: 'idx_auto_regenerate',
      fields: ['auto_regenerate', 'expires_at']
    }
  ],
  hooks: {
    beforeUpdate: (uniqueCode) => {
      uniqueCode.updateTimestamp = new Date();
    },
    beforeCreate: (uniqueCode) => {
      uniqueCode.createTimestamp = new Date();
      uniqueCode.updateTimestamp = new Date();
      
      // Generate unique code if not provided
      if (!uniqueCode.uniqueCode) {
        uniqueCode.uniqueCode = GymUniqueCodes.generateUniqueCode();
      }
    },
    afterCreate: (uniqueCode) => {
      console.log(`New unique code created: ${uniqueCode.uniqueCode} for gym ${uniqueCode.gymId}`);
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
    
    // Temporary codes must have expiry date
    temporaryMustHaveExpiry() {
      if (this.codeType !== 'permanent' && !this.expiresAt) {
        throw new Error('Non-permanent codes must have an expiry date');
      }
    },
    
    // Code format validation
    codeFormat() {
      if (this.uniqueCode && !/^[A-Z0-9]{4,10}$/.test(this.uniqueCode)) {
        throw new Error('Code must be 4-10 characters, uppercase letters and numbers only');
      }
    }
  }
});

// Static methods for code generation and management
GymUniqueCodes.generateUniqueCode = function(length = 6) {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  
  // Ensure first character is not 0
  result += characters.charAt(Math.floor(Math.random() * (characters.length - 10)) + 10);
  
  for (let i = 1; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

GymUniqueCodes.generateUniqueCodeForGym = async function(gymId, length = 6, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = this.generateUniqueCode(length);
    
    // Check if code already exists
    const existing = await this.findOne({
      where: { uniqueCode: code }
    });
    
    if (!existing) {
      return code;
    }
  }
  
  throw new Error('Unable to generate unique code after maximum attempts');
};

GymUniqueCodes.createGymUniqueCode = async function(gymId, options = {}) {
  const {
    codeType = 'permanent',
    codeName = null,
    codeLength = 6,
    maxUsageCount = null,
    expiresAt = null,
    autoRegenerate = false,
    createdBy = null
  } = options;

  // Set expiry based on code type
  let finalExpiresAt = expiresAt;
  if (!expiresAt) {
    const now = new Date();
    switch (codeType) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        finalExpiresAt = tomorrow;
        break;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        finalExpiresAt = nextWeek;
        break;
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setHours(0, 0, 0, 0);
        finalExpiresAt = nextMonth;
        break;
    }
  }

  const uniqueCode = await this.generateUniqueCodeForGym(gymId, codeLength);
  
  return await this.create({
    gymId,
    uniqueCode,
    codeType,
    codeName: codeName || `${codeType} Access Code`,
    maxUsageCount,
    expiresAt: finalExpiresAt,
    autoRegenerate,
    createdBy
  });
};

GymUniqueCodes.validateUniqueCode = async function(code) {
  const uniqueCode = await this.findOne({
    where: {
      uniqueCode: code.toUpperCase(),
      isActive: true
    },
    include: [
      {
        association: 'gym',
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
      }
    ]
  });

  if (!uniqueCode) {
    return { isValid: false, reason: 'Code not found or inactive' };
  }

  // Check expiry
  if (uniqueCode.expiresAt && new Date() > uniqueCode.expiresAt) {
    return { isValid: false, reason: 'Code has expired' };
  }

  // Check usage limit
  if (uniqueCode.maxUsageCount && uniqueCode.usageCount >= uniqueCode.maxUsageCount) {
    return { isValid: false, reason: 'Code usage limit exceeded' };
  }

  return {
    isValid: true,
    codeData: uniqueCode,
    gym: uniqueCode.gym
  };
};

GymUniqueCodes.incrementUsage = async function(codeId) {
  const code = await this.findByPk(codeId);
  if (!code) {
    throw new Error('Code not found');
  }

  await code.increment('usageCount');
  
  // Auto-deactivate if usage limit reached
  if (code.maxUsageCount && (code.usageCount + 1) >= code.maxUsageCount) {
    await code.update({ isActive: false });
  }

  return code.reload();
};

GymUniqueCodes.getGymActiveCodes = async function(gymId) {
  return await this.findAll({
    where: {
      gymId: gymId,
      isActive: true
    },
    order: [['createTimestamp', 'DESC']]
  });
};

GymUniqueCodes.getExpiredCodes = async function() {
  return await this.findAll({
    where: {
      expiresAt: {
        [sequelize.Sequelize.Op.lte]: new Date()
      },
      isActive: true
    }
  });
};

GymUniqueCodes.cleanupExpiredCodes = async function() {
  const expiredCodes = await this.getExpiredCodes();
  
  if (expiredCodes.length > 0) {
    await this.update(
      { isActive: false },
      {
        where: {
          id: { [sequelize.Sequelize.Op.in]: expiredCodes.map(code => code.id) }
        }
      }
    );
    
    console.log(`Deactivated ${expiredCodes.length} expired unique codes`);
  }
  
  return expiredCodes.length;
};

GymUniqueCodes.regenerateExpiredCodes = async function() {
  const expiredCodes = await this.findAll({
    where: {
      expiresAt: {
        [sequelize.Sequelize.Op.lte]: new Date()
      },
      isActive: true,
      autoRegenerate: true
    }
  });

  const results = [];

  for (const code of expiredCodes) {
    // Deactivate old code
    await code.update({ isActive: false });

    // Create new code with same settings
    const newCode = await this.createGymUniqueCode(code.gymId, {
      codeType: code.codeType,
      codeName: code.codeName,
      maxUsageCount: code.maxUsageCount,
      autoRegenerate: true,
      createdBy: code.createdBy
    });

    results.push({
      oldCode: code.uniqueCode,
      newCode: newCode.uniqueCode,
      gymId: code.gymId,
      codeType: code.codeType
    });
  }

  console.log(`Regenerated ${results.length} expired auto-regenerate codes`);
  return results;
};

GymUniqueCodes.bulkCreateCodesForGym = async function(gymId, codeConfigs) {
  const results = [];
  
  for (const config of codeConfigs) {
    try {
      const code = await this.createGymUniqueCode(gymId, config);
      results.push({ success: true, code: code });
    } catch (error) {
      results.push({ success: false, error: error.message, config });
    }
  }
  
  return results;
};

// Instance methods
GymUniqueCodes.prototype.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

GymUniqueCodes.prototype.isUsageLimitReached = function() {
  return this.maxUsageCount && this.usageCount >= this.maxUsageCount;
};

GymUniqueCodes.prototype.canBeUsed = function() {
  return this.isActive && !this.isExpired() && !this.isUsageLimitReached();
};

GymUniqueCodes.prototype.getRemainingUsage = function() {
  if (!this.maxUsageCount) return null;
  return Math.max(0, this.maxUsageCount - this.usageCount);
};

GymUniqueCodes.prototype.getExpiryStatus = function() {
  if (!this.expiresAt) return 'no_expiry';
  
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);
  
  if (hoursUntilExpiry <= 0) return 'expired';
  if (hoursUntilExpiry <= 1) return 'expiring_soon';
  if (hoursUntilExpiry <= 24) return 'expiring_today';
  return 'active';
};

GymUniqueCodes.prototype.getDaysUntilExpiry = function() {
  if (!this.expiresAt) return null;
  
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysUntilExpiry);
};

GymUniqueCodes.prototype.shouldRegenerate = function() {
  return this.autoRegenerate && this.isExpired();
};

module.exports = GymUniqueCodes;
