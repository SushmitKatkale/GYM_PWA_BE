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
  food_item: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quantity: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  protein: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  carbs: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  fat: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  fiber: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  sugar: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  sodium: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  preferred_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  alternatives: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  meal_description: {
    type: DataTypes.TEXT,
    allowNull: true
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

DietPlanMeal.prototype.updateMeal = async function(mealData) {
  // Update only provided fields
  if (mealData.meal_description !== undefined) this.meal_description = mealData.meal_description;
  if (mealData.food_item !== undefined) this.food_item = mealData.food_item;
  if (mealData.description !== undefined) this.description = mealData.description;
  if (mealData.instructions !== undefined) this.instructions = mealData.instructions;
  if (mealData.quantity !== undefined) this.quantity = mealData.quantity;
  if (mealData.calories !== undefined) this.calories = mealData.calories;
  if (mealData.protein !== undefined) this.protein = mealData.protein;
  if (mealData.carbs !== undefined) this.carbs = mealData.carbs;
  if (mealData.fat !== undefined) this.fat = mealData.fat;
  if (mealData.fiber !== undefined) this.fiber = mealData.fiber;
  if (mealData.sugar !== undefined) this.sugar = mealData.sugar;
  if (mealData.sodium !== undefined) this.sodium = mealData.sodium;
  if (mealData.image_url !== undefined) this.image_url = mealData.image_url;
  if (mealData.preferred_time !== undefined) this.preferred_time = mealData.preferred_time;
  if (mealData.is_mandatory !== undefined) this.is_mandatory = mealData.is_mandatory;
  if (mealData.alternatives !== undefined) this.alternatives = mealData.alternatives;
  
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
    const mealObj = {
      plan_id: planId,
      meal_type: mealData.meal_type
    };
    
    // Add all optional fields if provided
    if (mealData.meal_description !== undefined) mealObj.meal_description = mealData.meal_description;
    if (mealData.food_item !== undefined) mealObj.food_item = mealData.food_item;
    if (mealData.description !== undefined) mealObj.description = mealData.description;
    if (mealData.instructions !== undefined) mealObj.instructions = mealData.instructions;
    if (mealData.quantity !== undefined) mealObj.quantity = mealData.quantity;
    if (mealData.calories !== undefined) mealObj.calories = mealData.calories;
    if (mealData.protein !== undefined) mealObj.protein = mealData.protein;
    if (mealData.carbs !== undefined) mealObj.carbs = mealData.carbs;
    if (mealData.fat !== undefined) mealObj.fat = mealData.fat;
    if (mealData.fiber !== undefined) mealObj.fiber = mealData.fiber;
    if (mealData.sugar !== undefined) mealObj.sugar = mealData.sugar;
    if (mealData.sodium !== undefined) mealObj.sodium = mealData.sodium;
    if (mealData.image_url !== undefined) mealObj.image_url = mealData.image_url;
    if (mealData.preferred_time !== undefined) mealObj.preferred_time = mealData.preferred_time;
    if (mealData.is_mandatory !== undefined) mealObj.is_mandatory = mealData.is_mandatory;
    if (mealData.alternatives !== undefined) mealObj.alternatives = mealData.alternatives;
    
    const meal = await this.create(mealObj);
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
