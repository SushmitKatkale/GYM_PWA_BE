const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymCheckInMethods = sequelize.define('GymCheckInMethods', {
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
  methodType: {
    type: DataTypes.ENUM('gym_qr_scan', 'gym_code', 'quick_checkin', 'owner_scan_user', 'fingerprint', 'face_scan'),
    allowNull: false,
    defaultValue: 'quick_checkin',
    field: 'method_type'
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_enabled'
  },
  requiresLocationCheck: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'requires_location_check'
  },
  maxDistanceMeters: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 1000
    },
    field: 'max_distance_meters'
  },
  priorityOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 10
    },
    field: 'priority_order'
  },
  methodName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Quick Check-in',
    field: 'method_name'
  },
  methodDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Simple location-based check-in',
    field: 'method_description'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
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
  createdBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'created_by'
  },
  updatedBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'gym_checkin_methods',
  timestamps: false,
  indexes: [
    {
      name: 'unique_gym_method',
      unique: true,
      fields: ['gym_id', 'method_type']
    },
    {
      name: 'idx_gym_enabled_methods',
      fields: ['gym_id', 'is_enabled']
    },
    {
      name: 'idx_method_priority',
      fields: ['gym_id', 'priority_order']
    },
    {
      name: 'idx_method_type',
      fields: ['method_type', 'is_enabled']
    }
  ],
  hooks: {
    beforeUpdate: (gymCheckInMethod) => {
      gymCheckInMethod.updateTimestamp = new Date();
    },
    beforeCreate: (gymCheckInMethod) => {
      gymCheckInMethod.createTimestamp = new Date();
      gymCheckInMethod.updateTimestamp = new Date();
    }
  },
  validate: {
    // Ensure priority order is unique within a gym
    async uniquePriorityOrder() {
      if (this.priorityOrder) {
        const existing = await GymCheckInMethods.findOne({
          where: {
            gymId: this.gymId,
            priorityOrder: this.priorityOrder,
            id: { [sequelize.Sequelize.Op.ne]: this.id || 0 },
            isActive: true
          }
        });
        
        if (existing) {
          throw new Error(`Priority order ${this.priorityOrder} already exists for this gym`);
        }
      }
    }
  }
});

// Static methods for common queries
GymCheckInMethods.getGymEnabledMethods = async function(gymId) {
  return await this.findAll({
    where: {
      gymId: gymId,
      isEnabled: true,
      isActive: true
    },
    order: [['priorityOrder', 'ASC']]
  });
};

GymCheckInMethods.getMethodConfig = async function(gymId, methodType) {
  return await this.findOne({
    where: {
      gymId: gymId,
      methodType: methodType,
      isActive: true
    }
  });
};

GymCheckInMethods.bulkUpdateGymMethods = async function(gymId, methods) {
  const transaction = await sequelize.transaction();
  
  try {
    // Update existing methods or create new ones
    for (const method of methods) {
      await this.upsert({
        gymId: gymId,
        methodType: method.methodType,
        isEnabled: method.isEnabled !== undefined ? method.isEnabled : true,
        requiresLocationCheck: method.requiresLocationCheck !== undefined ? method.requiresLocationCheck : true,
        maxDistanceMeters: method.maxDistanceMeters || 50,
        priorityOrder: method.priorityOrder || 1,
        methodName: method.methodName || this.getDefaultMethodName(method.methodType),
        methodDescription: method.methodDescription || this.getDefaultMethodDescription(method.methodType),
        updatedBy: method.updatedBy || null
      }, {
        transaction
      });
    }
    
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

GymCheckInMethods.getDefaultMethodName = function(methodType) {
  const names = {
    'quick_checkin': 'Quick Check-in',
    'gym_qr_scan': 'Scan Gym QR Code',
    'gym_code': 'Enter Gym Code',
    'owner_scan_user': 'Owner Scan',
    'fingerprint': 'Fingerprint Scan',
    'face_scan': 'Face Recognition'
  };
  return names[methodType] || 'Unknown Method';
};

GymCheckInMethods.getDefaultMethodDescription = function(methodType) {
  const descriptions = {
    'quick_checkin': 'Simple location-based check-in',
    'gym_qr_scan': 'Scan the gym QR code to check in',
    'gym_code': 'Enter the gym unique code to check in',
    'owner_scan_user': 'Gym staff scans your QR code',
    'fingerprint': 'Use fingerprint to check in',
    'face_scan': 'Use face recognition to check in'
  };
  return descriptions[methodType] || 'Standard check-in method';
};

// Instance methods
GymCheckInMethods.prototype.isLocationRequired = function() {
  return this.requiresLocationCheck && this.isEnabled;
};

GymCheckInMethods.prototype.getMaxDistance = function() {
  return this.maxDistanceMeters || 50;
};

GymCheckInMethods.prototype.canUserCheckIn = function(distance) {
  if (!this.isEnabled || !this.isActive) {
    return { canCheckIn: false, reason: 'Method not enabled' };
  }
  
  if (this.requiresLocationCheck && distance > this.maxDistanceMeters) {
    return { 
      canCheckIn: false, 
      reason: `Too far from gym (${distance}m > ${this.maxDistanceMeters}m)` 
    };
  }
  
  return { canCheckIn: true, reason: null };
};

module.exports = GymCheckInMethods;
