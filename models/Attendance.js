const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
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
  attendanceType: {
    type: DataTypes.ENUM('normal', 'trial', 'guest'),
    allowNull: false,
    defaultValue: 'normal',
    field: 'attendance_type'
  },
  methodId: {
    type: DataTypes.TINYINT,
    allowNull: false,
    field: 'method_id',
    references: {
      model: 'checkin_methods',
      key: 'id'
    }
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'check_in_time'
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'check_out_time'
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'duration_minutes'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
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
  tableName: 'attendances',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  hooks: {
    beforeUpdate: (attendance) => {
      // Calculate duration if check_out_time is set
      if (attendance.checkOutTime && attendance.checkInTime) {
        const duration = Math.floor((new Date(attendance.checkOutTime) - new Date(attendance.checkInTime)) / (1000 * 60));
        attendance.durationMinutes = duration;
      }
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
      const hasLat = this.latitude !== null;
      const hasLng = this.longitude !== null;
      
      if (hasLat !== hasLng) {
        throw new Error('Both latitude and longitude must be provided together');
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
  return this.checkOutTime === null;
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
Attendance.getUserActiveSession = async function(userId) {
  return await this.findOne({
    where: {
      userId: userId,
      checkOutTime: null
    },
    order: [['checkInTime', 'DESC']]
  });
};

Attendance.getGymCurrentOccupancy = async function(gymId) {
  const count = await this.count({
    where: {
      gymId: gymId,
      checkOutTime: null
    }
  });
  return count;
};

Attendance.getUserAttendanceHistory = async function(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    startDate = null,
    endDate = null,
    gymId = null
  } = options;

  const whereClause = {
    userId: userId
  };

  if (startDate && endDate) {
    whereClause.checkInTime = {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    };
  }

  if (gymId) {
    whereClause.gymId = gymId;
  }

  return await this.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['checkInTime', 'DESC']],
    include: [
      {
        association: 'gym',
              }
    ]
  });
};

module.exports = Attendance;
