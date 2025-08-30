const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SlotChangeHistory = sequelize.define('SlotChangeHistory', {
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
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'user_subscriptions',
      key: 'id'
    },
    field: 'user_subscription_id'
  },
  oldGymSlotId: {
    type: DataTypes.BIGINT,
    allowNull: true, // null for initial selection
    references: {
      model: 'gym_slots',
      key: 'id'
    },
    field: 'old_gym_slot_id'
  },
  newGymSlotId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'gym_slots',
      key: 'id'
    },
    field: 'new_gym_slot_id'
  },
  changeDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'change_date'
  },
  changeReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'change_reason'
  },
  changeType: {
    type: DataTypes.ENUM('initial_selection', 'permanent_change', 'temporary_change'),
    allowNull: false,
    field: 'change_type'
  },
  effectiveFromDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'effective_from_date'
  },
  effectiveToDate: {
    type: DataTypes.DATEONLY,
    allowNull: true, // null for permanent changes
    field: 'effective_to_date'
  },
  requestedBy: {
    type: DataTypes.ENUM('user', 'admin', 'system'),
    allowNull: false,
    defaultValue: 'user',
    field: 'requested_by'
  },
  approvedBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'approved_by'
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'auto_approved'),
    allowNull: false,
    defaultValue: 'auto_approved',
    field: 'approval_status'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
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
  tableName: 'slot_change_history',
  timestamps: false,
  indexes: [
    {
      fields: ['user_email']
    },
    {
      fields: ['user_subscription_id']
    },
    {
      fields: ['old_gym_slot_id']
    },
    {
      fields: ['new_gym_slot_id']
    },
    {
      fields: ['change_date']
    },
    {
      fields: ['change_type']
    },
    {
      fields: ['approval_status']
    },
    {
      fields: ['effective_from_date']
    }
  ],
  hooks: {
    beforeUpdate: (slotChangeHistory) => {
      slotChangeHistory.updateTimestamp = new Date();
    }
  }
});

module.exports = SlotChangeHistory;
