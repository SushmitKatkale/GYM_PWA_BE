const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DietPlanMeal = sequelize.define('DietPlanMeal', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  plan_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'diet_plans',
      key: 'id'
    }
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'snack', 'dinner', 'other'),
    allowNull: false
  },
  meal_description: {
    type: DataTypes.TEXT,
    allowNull: false
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
  tableName: 'diet_plan_meals',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['plan_id']
    },
    {
      fields: ['meal_type']
    }
  ]
});

// Instance methods
DietPlanMeal.prototype.isActive = function() {
  return this.record_status === 1;
};

DietPlanMeal.prototype.getDietPlan = async function() {
  const DietPlan = require('./DietPlan');
  return await DietPlan.findByPk(this.plan_id);
};

DietPlanMeal.prototype.updateMeal = async function(newDescription) {
  this.meal_description = newDescription;
  await this.save();
  return this;
};

DietPlanMeal.prototype.removeMeal = async function() {
  this.record_status = 0;
  await this.save();
  return this;
};

DietPlanMeal.prototype.getMealOrder = function() {
  const mealOrder = {
    'breakfast': 1,
    'snack': 2,
    'lunch': 3,
    'snack': 4,
    'dinner': 5,
    'other': 6
  };
  return mealOrder[this.meal_type] || 7;
};

// Static methods
DietPlanMeal.findByPlan = async function(planId, options = {}) {
  const where = {
    plan_id: planId,
    record_status: 1
  };

  if (options.mealType) {
    where.meal_type = options.mealType;
  }

  return await this.findAll({
    where,
    order: [
      [sequelize.literal(`CASE meal_type 
        WHEN 'breakfast' THEN 1 
        WHEN 'snack' THEN 2 
        WHEN 'lunch' THEN 3 
        WHEN 'dinner' THEN 4 
        WHEN 'other' THEN 5 
        ELSE 6 END`), 'ASC'],
      ['created_at', 'ASC']
    ]
  });
};

DietPlanMeal.findByMealType = async function(mealType, options = {}) {
  const where = {
    meal_type: mealType,
    record_status: 1
  };

  if (options.planId) {
    where.plan_id = options.planId;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: options.include || []
  });
};

DietPlanMeal.createMeals = async function(planId, mealsData) {
  const meals = [];
  
  for (const mealData of mealsData) {
    const meal = await this.create({
      plan_id: planId,
      meal_type: mealData.meal_type,
      meal_description: mealData.meal_description
    });
    
    meals.push(meal);
  }

  return meals;
};

DietPlanMeal.getMealTypeCounts = async function(planId) {
  const counts = await this.findAll({
    attributes: [
      'meal_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'meal_count']
    ],
    where: {
      plan_id: planId,
      record_status: 1
    },
    group: ['meal_type'],
    raw: true
  });

  // Convert to object format for easier access
  const result = {};
  counts.forEach(count => {
    result[count.meal_type] = parseInt(count.meal_count);
  });

  return result;
};

DietPlanMeal.getTrainerMealStats = async function(trainerId, options = {}) {
  const DietPlan = require('./DietPlan');
  
  const where = {
    record_status: 1
  };

  if (options.startDate && options.endDate) {
    where.created_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate + ' 00:00:00', options.endDate + ' 23:59:59']
    };
  }

  const stats = await this.findAll({
    attributes: [
      'meal_type',
      [sequelize.fn('COUNT', sequelize.col('DietPlanMeal.id')), 'total_meals'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT DietPlanMeal.plan_id')), 'unique_plans']
    ],
    include: [{
      model: DietPlan,
      as: 'plan',
      where: {
        trainer_id: trainerId,
        record_status: 1
      },
      attributes: []
    }],
    where,
    group: ['meal_type'],
    raw: true
  });

  return stats;
};

DietPlanMeal.copyMealsToNewPlan = async function(sourcePlanId, targetPlanId) {
  const sourceMeals = await this.findByPlan(sourcePlanId);
  const newMeals = [];

  for (const meal of sourceMeals) {
    const newMeal = await this.create({
      plan_id: targetPlanId,
      meal_type: meal.meal_type,
      meal_description: meal.meal_description
    });
    
    newMeals.push(newMeal);
  }

  return newMeals;
};

DietPlanMeal.getMostCommonMeals = async function(mealType, limit = 10) {
  const commonMeals = await this.findAll({
    attributes: [
      'meal_description',
      [sequelize.fn('COUNT', sequelize.col('id')), 'usage_count']
    ],
    where: {
      meal_type: mealType,
      record_status: 1
    },
    group: ['meal_description'],
    order: [[sequelize.literal('usage_count'), 'DESC']],
    limit,
    raw: true
  });

  return commonMeals;
};

module.exports = DietPlanMeal;
