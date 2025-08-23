const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Gym = sequelize.define('Gym', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  openingTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  closingTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  activeStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  createTimestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0,
      max: 5
    }
  },
  currentOccupancy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  // Attendance tracking fields
  checkInRadiusMeters: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 10,
      max: 1000
    },
    field: 'check_in_radius_meters'
  },
  defaultSessionDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 120,
    validate: {
      min: 15,
      max: 480
    },
    field: 'default_session_duration_minutes'
  },
  autoCheckoutEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_checkout_enabled'
  },
  autoCheckoutAfterHours: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 24,
    validate: {
      min: 1,
      max: 168
    },
    field: 'auto_checkout_after_hours'
  },
  locationVerificationRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'location_verification_required'
  },
  maxOccupancy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    validate: {
      min: 1
    },
    field: 'max_occupancy'
  },
  allowMultipleCheckins: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'allow_multiple_checkins'
  },
  checkInNotificationEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'check_in_notification_enabled'
  },
  checkOutNotificationEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'check_out_notification_enabled'
  },
  attendanceTrackingEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'attendance_tracking_enabled'
  },
  biometricCheckinEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'biometric_checkin_enabled'
  },
  ownerScanEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'owner_scan_enabled'
  },
  qrCodeCheckinEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'qr_code_checkin_enabled'
  },
  uniqueCodeCheckinEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'unique_code_checkin_enabled'
  },
  quickCheckinEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'quick_checkin_enabled'
  }
}, {
  tableName: 'gyms',
  timestamps: false, // We're using custom timestamp fields
  hooks: {
    beforeUpdate: (gym) => {
      gym.updateTimestamp = new Date();
    }
  }
});

module.exports = Gym;
