const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserFitnessGoal = sequelize.define('UserFitnessGoal', {
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
  goalId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'goal_id',
    references: {
      model: 'fitness_goals',
      key: 'id'
    }
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  targetDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'target_date'
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
  tableName: 'user_fitness_goals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'goal_id']
    }
  ]
});

// Instance methods
UserFitnessGoal.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations
UserFitnessGoal.associate = function(models) {
  UserFitnessGoal.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  UserFitnessGoal.belongsTo(models.FitnessGoal, {
    foreignKey: 'goalId',
    as: 'goal'
  });
};

module.exports = UserFitnessGoal;
