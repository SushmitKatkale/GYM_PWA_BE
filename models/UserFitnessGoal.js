const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserFitnessGoal = sequelize.define('UserFitnessGoal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userEmail: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'user_email',
    references: {
      model: 'users',
      key: 'email'
    }
  },
  goalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'goal_id',
    references: {
      model: 'fitness_goals',
      key: 'id'
    }
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '1=High, 2=Medium, 3=Low',
    validate: {
      min: 1,
      max: 3
    }
  },
  targetDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'target_date',
    comment: 'Target date to achieve this fitness goal'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'create_timestamp'
  }
}, {
  tableName: 'user_fitness_goals',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_email', 'goal_id']
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
    foreignKey: 'userEmail',
    targetKey: 'email',
    as: 'user'
  });
  
  UserFitnessGoal.belongsTo(models.FitnessGoal, {
    foreignKey: 'goalId',
    as: 'goal'
  });
};

module.exports = UserFitnessGoal;
