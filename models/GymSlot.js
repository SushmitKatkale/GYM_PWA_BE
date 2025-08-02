const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymSlot = sequelize.define('GymSlot', {
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
  slotName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'slot_name'
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'end_time'
  },
  maxCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    },
    field: 'max_capacity'
  },
  daysOfWeek: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of day numbers: 1=Monday, 2=Tuesday, etc.',
    field: 'days_of_week'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  slotColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#3498db',
    field: 'slot_color'
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
  tableName: 'gym_slots',
  timestamps: false,
  indexes: [
    {
      fields: ['gym_id']
    },
    {
      fields: ['active_status']
    },
    {
      fields: ['start_time', 'end_time']
    }
  ],
  hooks: {
    beforeUpdate: (gymSlot) => {
      gymSlot.updateTimestamp = new Date();
    }
  }
});

module.exports = GymSlot;
