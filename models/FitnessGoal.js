const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FitnessGoal = sequelize.define('FitnessGoal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  goalName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'goal_name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'create_timestamp'
  }
}, {
  tableName: 'fitness_goals',
  timestamps: false,
  underscored: true
});

// Instance methods
FitnessGoal.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Associations
FitnessGoal.associate = function(models) {
  FitnessGoal.belongsToMany(models.User, {
    through: models.UserFitnessGoal,
    foreignKey: 'goalId',
    otherKey: 'userEmail',
    as: 'users'
  });
};

module.exports = FitnessGoal;
