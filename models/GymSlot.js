const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymSlot = sequelize.define('GymSlot', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  gym_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'gyms',
      key: 'id'
    }
  },
  slot_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  record_status: {
    type: DataTypes.TINYINT,
    defaultValue: 1
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
  tableName: 'gym_slots',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['gym_id']
    },
    {
      fields: ['slot_date']
    },
    {
      fields: ['gym_id', 'slot_date', 'start_time'],
      unique: true
    }
  ]
});

// Instance methods
GymSlot.prototype.isAvailable = function() {
  return this.record_status === 1;
};

GymSlot.prototype.getSlotDuration = function() {
  const start = new Date(`1970-01-01T${this.start_time}`);
  const end = new Date(`1970-01-01T${this.end_time}`);
  return (end - start) / (1000 * 60); // Duration in minutes
};

GymSlot.prototype.getRemainingCapacity = async function() {
  const UserSlotBooking = require('./UserSlotBooking');
  const bookedCount = await UserSlotBooking.count({
    where: {
      slot_id: this.id,
      booking_status: 1,
      record_status: 1
    }
  });
  return Math.max(0, this.capacity - bookedCount);
};

GymSlot.prototype.isFull = async function() {
  const remaining = await this.getRemainingCapacity();
  return remaining === 0;
};

// Static methods
GymSlot.findAvailableSlots = async function(gymId, date, options = {}) {
  const where = {
    gym_id: gymId,
    slot_date: date,
    record_status: 1
  };

  if (options.startTime) {
    where.start_time = { [sequelize.Sequelize.Op.gte]: options.startTime };
  }

  return await this.findAll({
    where,
    order: [['start_time', 'ASC']],
    include: options.include || []
  });
};

GymSlot.findByGymAndDateRange = async function(gymId, startDate, endDate) {
  return await this.findAll({
    where: {
      gym_id: gymId,
      slot_date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      },
      record_status: 1
    },
    order: [['slot_date', 'ASC'], ['start_time', 'ASC']]
  });
};

GymSlot.createRecurringSlots = async function(gymId, slotConfig, startDate, endDate) {
  const slots = [];
  const currentDate = new Date(startDate);
  const finalDate = new Date(endDate);

  while (currentDate <= finalDate) {
    const slot = await this.create({
      gym_id: gymId,
      slot_date: new Date(currentDate),
      start_time: slotConfig.start_time,
      end_time: slotConfig.end_time,
      capacity: slotConfig.capacity
    });
    slots.push(slot);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
};

module.exports = GymSlot;
