const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SlotAvailability = sequelize.define('SlotAvailability', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gymSlotId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'gym_slots',
      key: 'id'
    },
    field: 'gym_slot_id'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  availableCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    },
    field: 'available_capacity'
  },
  bookedCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    field: 'booked_capacity'
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_available'
  },
  reasonIfUnavailable: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'reason_if_unavailable'
  },
  specialNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'special_note'
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
  tableName: 'slot_availability',
  timestamps: false,
  indexes: [
    {
      fields: ['gym_slot_id', 'date'],
      unique: true
    },
    {
      fields: ['date']
    },
    {
      fields: ['is_available']
    },
    {
      fields: ['gym_slot_id']
    }
  ],
  hooks: {
    beforeUpdate: (slotAvailability) => {
      slotAvailability.updateTimestamp = new Date();
    }
  }
});

module.exports = SlotAvailability;
