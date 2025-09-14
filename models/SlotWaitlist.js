const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const SlotWaitlist = sequelize.define('SlotWaitlist', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
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
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  waitlistPosition: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'waitlist_position'
  },
  requestedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'requested_date',
    comment: 'The date for which the user is requesting the slot'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'cleared'),
    defaultValue: 'waiting'
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
  tableName: 'slot_waitlist',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['slot_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['slot_id', 'requested_date', 'waitlist_position']
    },
    {
      fields: ['status']
    },
    {
      fields: ['slot_id', 'requested_date', 'status', 'record_status']
    },
    {
      fields: ['requested_date']
    }
  ]
});

// Instance methods
SlotWaitlist.prototype.isWaiting = function() {
  return this.status === 'waiting' && this.record_status === 1;
};

SlotWaitlist.prototype.clearFromWaitlist = async function() {
  const UserSlotBooking = require('./UserSlotBooking');
  const GymSlot = require('./GymSlot');
  
  // Use the requestedDate from the waitlist entry for booking
  const slot = await GymSlot.findByPk(this.slotId);
  
  if (slot) {
    try {
      await UserSlotBooking.create({
        user_id: this.userId,
        slot_id: this.slotId,
        booking_status: 1,
        booking_date: this.requestedDate // Use requestedDate instead of slot.slot_date
      });

      // Mark waitlist entry as cleared
      this.status = 'cleared';
      await this.save();

      // Reorder remaining waitlist positions
      await this.reorderWaitlist();

      return true;
    } catch (error) {
      console.error('Error clearing waitlist:', error);
      return false;
    }
  }
  
  return false;
};

SlotWaitlist.prototype.reorderWaitlist = async function() {
  const waitlistEntries = await SlotWaitlist.findAll({
    where: {
      slot_id: this.slotId,
      requested_date: this.requestedDate, // Include requestedDate to keep within same date
      status: 'waiting',
      record_status: 1,
      waitlist_position: {
        [Op.gt]: this.waitlistPosition
      }
    },
    order: [['waitlist_position', 'ASC']]
  });

  // Update positions
  for (const entry of waitlistEntries) {
    entry.waitlistPosition -= 1;
    await entry.save();
  }
};

SlotWaitlist.prototype.getSlotDetails = async function() {
  const GymSlot = require('./GymSlot');
  return await GymSlot.findByPk(this.slotId);
};

SlotWaitlist.prototype.getUserDetails = async function() {
  const User = require('./User');
  return await User.findByPk(this.userId, {
      });
};

// Static methods
SlotWaitlist.findSlotWaitlist = async function(slotId, options = {}) {
  const where = {
    slot_id: slotId,
    record_status: 1
  };

  if (options.requestedDate) {
    where.requested_date = options.requestedDate;
  }

  if (options.status) {
    where.status = options.status;
  }

  return await this.findAll({
    where,
    order: [['waitlist_position', 'ASC']],
    include: options.include || []
  });
};

SlotWaitlist.findUserWaitlist = async function(userId, options = {}) {
  const where = {
    user_id: userId,
    record_status: 1
  };

  if (options.requestedDate) {
    where.requested_date = options.requestedDate;
  }

  if (options.status) {
    where.status = options.status;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: options.include || []
  });
};

SlotWaitlist.addToWaitlist = async function(userId, slotId, requestedDate) {
  if (!requestedDate) {
    throw new Error('requestedDate is required for waitlist entries');
  }

  // Check if user is already on waitlist for this slot and date
  const existingEntry = await this.findOne({
    where: {
      user_id: userId,
      slot_id: slotId,
      requested_date: requestedDate,
      status: 'waiting',
      record_status: 1
    }
  });

  if (existingEntry) {
    throw new Error('User is already on the waitlist for this slot and date');
  }

  // Get next position for this slot and date
  const nextPosition = await this.count({
    where: {
      slot_id: slotId,
      requested_date: requestedDate,
      status: 'waiting',
      record_status: 1
    }
  }) + 1;

  // Create waitlist entry
  return await this.create({
    slot_id: slotId,
    user_id: userId,
    requested_date: requestedDate,
    waitlist_position: nextPosition,
    status: 'waiting'
  });
};

SlotWaitlist.removeFromWaitlist = async function(userId, slotId, requestedDate) {
  const where = {
    user_id: userId,
    slot_id: slotId,
    status: 'waiting',
    record_status: 1
  };

  if (requestedDate) {
    where.requested_date = requestedDate;
  }

  const entry = await this.findOne({ where });

  if (!entry) {
    throw new Error('User not found on waitlist for this slot' + (requestedDate ? ' and date' : ''));
  }

  // Mark as removed
  entry.record_status = 0;
  await entry.save();

  // Reorder remaining positions
  await entry.reorderWaitlist();

  return entry;
};

SlotWaitlist.getWaitlistStats = async function(gymId, startDate, endDate) {
  const GymSlot = require('./GymSlot');
  
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col('SlotWaitlist.created_at')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('SlotWaitlist.id')), 'total_waitlist'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "waiting" THEN 1 END')), 'active_waitlist'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "cleared" THEN 1 END')), 'cleared_waitlist']
    ],
    include: [{
      model: GymSlot,
      as: 'slot',
      where: { gym_id: gymId },
      attributes: []
    }],
    where: {
      created_at: {
        [sequelize.Sequelize.Op.between]: [startDate + ' 00:00:00', endDate + ' 23:59:59']
      },
      record_status: 1
    },
    group: [sequelize.fn('DATE', sequelize.col('SlotWaitlist.created_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('SlotWaitlist.created_at')), 'ASC']],
    raw: true
  });

  return stats;
};

SlotWaitlist.processNextInQueue = async function(slotId, requestedDate) {
  const where = {
    slot_id: slotId,
    status: 'waiting',
    record_status: 1
  };

  if (requestedDate) {
    where.requested_date = requestedDate;
  }

  const nextEntry = await this.findOne({
    where,
    order: [['waitlist_position', 'ASC']]
  });

  if (nextEntry) {
    return await nextEntry.clearFromWaitlist();
  }

  return false;
};

module.exports = SlotWaitlist;

