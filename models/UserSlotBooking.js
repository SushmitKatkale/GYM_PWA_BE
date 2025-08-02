const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSlotBooking = sequelize.define('UserSlotBooking', {
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
  userSubscriptionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user_subscriptions',
      key: 'id'
    },
    field: 'user_subscription_id'
  },
  gymSlotId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gym_slots',
      key: 'id'
    },
    field: 'gym_slot_id'
  },
  bookingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    },
    field: 'booking_date'
  },
  bookingStatus: {
    type: DataTypes.ENUM('active', 'cancelled', 'completed', 'no_show', 'checked_in'),
    allowNull: false,
    defaultValue: 'active',
    field: 'booking_status'
  },
  bookingType: {
    type: DataTypes.ENUM('regular', 'one_time_change', 'temporary'),
    allowNull: false,
    defaultValue: 'regular',
    field: 'booking_type'
  },
  checkinTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'checkin_time'
  },
  checkoutTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'checkout_time'
  },
  bookingNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'booking_notes'
  },
  cancelReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancel_reason'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
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
  tableName: 'user_slot_bookings',
  timestamps: false,
  indexes: [
    {
      fields: ['user_email']
    },
    {
      fields: ['user_subscription_id']
    },
    {
      fields: ['gym_slot_id']
    },
    {
      fields: ['booking_date']
    },
    {
      fields: ['booking_status']
    },
    {
      fields: ['gym_slot_id', 'booking_date']
    },
    {
      fields: ['user_email', 'booking_date']
    }
  ],
  hooks: {
    beforeUpdate: (userSlotBooking) => {
      userSlotBooking.updateTimestamp = new Date();
    }
  }
});

module.exports = UserSlotBooking;
