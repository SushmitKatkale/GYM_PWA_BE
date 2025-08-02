const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SlotWaitlist = sequelize.define('SlotWaitlist', {
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
  gymSlotId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gym_slots',
      key: 'id'
    },
    field: 'gym_slot_id'
  },
  requestedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    },
    field: 'requested_date'
  },
  priorityScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'priority_score'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'fulfilled', 'cancelled'),
    allowNull: false,
    defaultValue: 'waiting'
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
  tableName: 'slot_waitlist',
  timestamps: false,
  indexes: [
    {
      fields: ['user_email']
    },
    {
      fields: ['gym_slot_id']
    },
    {
      fields: ['requested_date']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeUpdate: (slotWaitlist) => {
      slotWaitlist.updateTimestamp = new Date();
    }
  }
});

module.exports = SlotWaitlist;

