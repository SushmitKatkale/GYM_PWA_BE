const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    },
    field: 'user_email'
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
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'check_in_time'
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'check_out_time'
  },
  checkInMethod: {
    type: DataTypes.ENUM('gym_qr_scan', 'gym_code', 'quick_checkin', 'owner_scan_user', 'fingerprint', 'face_scan'),
    allowNull: false,
    defaultValue: 'quick_checkin',
    field: 'check_in_method'
  },
  userLocationLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    },
    field: 'user_location_lat'
  },
  userLocationLng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    },
    field: 'user_location_lng'
  },
  gymLocationLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    },
    field: 'gym_location_lat'
  },
  gymLocationLng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    },
    field: 'gym_location_lng'
  },
  distanceFromGym: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0
    },
    field: 'distance_from_gym'
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    field: 'duration_minutes'
  },
  qrCodeUsed: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'qr_code_used'
  },
  sessionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'session_notes'
  },
  sessionRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    field: 'session_rating'
  },
  isValidSession: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_valid_session'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    field: 'device_info'
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
  tableName: 'attendances',
  timestamps: false,
  indexes: [
    {
      name: 'idx_user_checkin',
      fields: ['user_email', 'check_in_time']
    },
    {
      name: 'idx_gym_date',
      fields: ['gym_id', { attribute: 'check_in_time', fn: 'DATE' }]
    },
    {
      name: 'idx_active_sessions',
      fields: ['user_email', 'check_out_time']
    },
    {
      name: 'idx_gym_active_sessions',
      fields: ['gym_id', 'check_out_time']
    },
    {
      name: 'idx_attendance_method_stats',
      fields: ['gym_id', 'check_in_method', { attribute: 'check_in_time', fn: 'DATE' }]
    },
    {
      name: 'idx_attendance_location',
      fields: ['user_location_lat', 'user_location_lng']
    },
    {
      name: 'idx_attendance_duration',
      fields: ['gym_id', 'duration_minutes'],
      where: {
        duration_minutes: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      name: 'idx_attendance_valid_sessions',
      fields: ['gym_id', 'is_valid_session', 'check_in_time']
    }
  ],
  hooks: {
    beforeUpdate: (attendance) => {
      attendance.updateTimestamp = new Date();
      
      // Calculate duration if check_out_time is set
      if (attendance.checkOutTime && attendance.checkInTime) {
        const duration = Math.floor((new Date(attendance.checkOutTime) - new Date(attendance.checkInTime)) / (1000 * 60));
        attendance.durationMinutes = duration;
      }
    },
    beforeCreate: (attendance) => {
      attendance.createTimestamp = new Date();
      attendance.updateTimestamp = new Date();
    }
  },
  validate: {
    // Ensure check_out_time is after check_in_time
    checkOutAfterCheckIn() {
      if (this.checkOutTime && this.checkInTime && this.checkOutTime <= this.checkInTime) {
        throw new Error('Check-out time must be after check-in time');
      }
    },
    
    // Ensure location data is consistent
    locationDataConsistency() {
      const hasUserLat = this.userLocationLat !== null;
      const hasUserLng = this.userLocationLng !== null;
      
      if (hasUserLat !== hasUserLng) {
        throw new Error('Both user latitude and longitude must be provided together');
      }
      
      const hasGymLat = this.gymLocationLat !== null;
      const hasGymLng = this.gymLocationLng !== null;
      
      if (hasGymLat !== hasGymLng) {
        throw new Error('Both gym latitude and longitude must be provided together');
      }
    }
  }
});

// Class methods for attendance analytics
Attendance.prototype.calculateDuration = function() {
  if (this.checkInTime && this.checkOutTime) {
    return Math.floor((new Date(this.checkOutTime) - new Date(this.checkInTime)) / (1000 * 60));
  }
  return 0;
};

Attendance.prototype.isCurrentlyActive = function() {
  return this.checkOutTime === null && this.isActive && this.isValidSession;
};

Attendance.prototype.getSessionDuration = function() {
  if (this.checkOutTime) {
    return this.durationMinutes || this.calculateDuration();
  } else {
    // Current session duration
    return Math.floor((new Date() - new Date(this.checkInTime)) / (1000 * 60));
  }
};

// Static methods for querying
Attendance.getUserActiveSession = async function(userEmail) {
  return await this.findOne({
    where: {
      userEmail: userEmail,
      checkOutTime: null,
      isActive: true,
      isValidSession: true
    },
    order: [['checkInTime', 'DESC']]
  });
};

Attendance.getGymCurrentOccupancy = async function(gymId) {
  const count = await this.count({
    where: {
      gymId: gymId,
      checkOutTime: null,
      isActive: true,
      isValidSession: true
    }
  });
  return count;
};

Attendance.getUserAttendanceHistory = async function(userEmail, options = {}) {
  const {
    limit = 20,
    offset = 0,
    startDate = null,
    endDate = null,
    gymId = null,
    method = null
  } = options;

  const whereClause = {
    userEmail: userEmail,
    isActive: true
  };

  if (startDate && endDate) {
    whereClause.checkInTime = {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    };
  }

  if (gymId) {
    whereClause.gymId = gymId;
  }

  if (method) {
    whereClause.checkInMethod = method;
  }

  return await this.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['checkInTime', 'DESC']],
    include: [
      {
        association: 'gym',
        attributes: ['id', 'name', 'address']
      }
    ]
  });
};

module.exports = Attendance;
