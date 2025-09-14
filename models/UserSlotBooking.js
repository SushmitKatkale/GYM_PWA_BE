const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSlotBooking = sequelize.define('UserSlotBooking', {
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
  slotId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'slot_id',
    references: {
      model: 'gym_slots',
      key: 'id'
    }
  },
  bookingStatus: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    field: 'booking_status',
    comment: '1=booked, 0=cancelled'
  },
  bookingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'booking_date'
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
  tableName: 'user_slot_bookings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  // indexes: [
  //   {
  //     unique: true,
  //     fields: ['user_id', 'slot_id', 'booking_date', 'booking_status'],
  //     name: 'unique_user_slot_booking_date_active',
  //     where: {
  //       booking_status: 1
  //     }
  //   }
  // ]
});

// Instance methods
UserSlotBooking.prototype.isActive = function() {
  return this.bookingStatus === 1 && this.recordStatus === 1;
};

UserSlotBooking.prototype.isCancelled = function() {
  return this.bookingStatus === 0;
};

UserSlotBooking.prototype.cancel = function() {
  this.bookingStatus = 0;
  return this.save();
};

UserSlotBooking.prototype.reactivate = function() {
  this.bookingStatus = 1;
  return this.save();
};

// Static methods
UserSlotBooking.getUserBookingsForDate = async function(userId, date) {
  return await this.findAll({
    where: {
      userId: userId,
      bookingDate: date,
      recordStatus: 1
    },
    include: [
      {
        association: 'slot',
        include: ['gym']
      }
    ],
    order: [['slot', 'start_time', 'ASC']]
  });
};

UserSlotBooking.getSlotBookingsCount = async function(slotId, date) {
  return await this.count({
    where: {
      slotId: slotId,
      bookingDate: date,
      bookingStatus: 1,
      recordStatus: 1
    }
  });
};

UserSlotBooking.isUserBookedForSlot = async function(userId, slotId, date) {
  const booking = await this.findOne({
    where: {
      userId: userId,
      slotId: slotId,
      bookingDate: date,
      bookingStatus: 1,
      recordStatus: 1
    }
  });
  
  return booking !== null;
};

module.exports = UserSlotBooking;
