const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DietPlan = sequelize.define('DietPlan', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  trainerId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'trainer_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
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
  title: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  protein_g: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  carbs_g: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fats_g: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'archived'),
    defaultValue: 'active'
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
  tableName: 'diet_plans',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['trainer_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['trainer_id', 'user_id']
    }
  ],
  hooks: {
    beforeUpdate: (dietPlan) => {
      dietPlan.updated_at = new Date();
    }
  }
});

// Instance methods
DietPlan.prototype.isActive = function() {
  return this.status === 'active' && this.record_status === 1;
};

DietPlan.prototype.archive = async function() {
  this.status = 'archived';
  await this.save();
  return this;
};

DietPlan.prototype.activate = async function() {
  this.status = 'active';
  await this.save();
  return this;
};

DietPlan.prototype.getMeals = async function() {
  const DietPlanMeal = require('./DietPlanMeal');
  return await DietPlanMeal.findAll({
    where: {
      plan_id: this.id,
      record_status: 1
    },
    order: [['created_at', 'ASC']]
  });
};

DietPlan.prototype.addMeal = async function(mealData) {
  const DietPlanMeal = require('./DietPlanMeal');
  return await DietPlanMeal.create({
    plan_id: this.id,
    meal_type: mealData.meal_type,
    meal_description: mealData.meal_description
  });
};

DietPlan.prototype.getTrainerDetails = async function() {
  if (!this.trainer_id) return null;
  
  const User = require('./User');
  return await User.findByPk(this.trainer_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
      attributes: ['dob', 'gender', 'bio']
    }]
  });
};

DietPlan.prototype.getUserDetails = async function() {
  const User = require('./User');
  return await User.findByPk(this.user_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
      attributes: ['dob', 'gender', 'height_cm', 'weight_kg']
    }]
  });
};

DietPlan.prototype.createChangeRequest = async function(requestData) {
  const DietChangeRequest = require('./DietChangeRequest');
  return await DietChangeRequest.create({
    user_id: this.user_id,
    trainer_id: this.trainer_id,
    plan_id: this.id,
    request_text: requestData.request_text
  });
};

DietPlan.prototype.createHistoryEntry = async function(changedBy) {
  const DietPlanHistory = require('./DietPlanHistory');
  
  // Capture current state
  const oldData = {
    title: this.title,
    description: this.description,
    calories: this.calories,
    protein_g: this.protein_g,
    carbs_g: this.carbs_g,
    fats_g: this.fats_g,
    status: this.status,
    meals: await this.getMeals()
  };

  return await DietPlanHistory.create({
    plan_id: this.id,
    old_data: oldData,
    changed_by: changedBy
  });
};

// Static methods
DietPlan.findByTrainer = async function(trainerId, options = {}) {
  const where = {
    trainer_id: trainerId,
    record_status: 1
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.userId) {
    where.user_id = options.userId;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: options.include || []
  });
};

DietPlan.findByUser = async function(userId, options = {}) {
  const where = {
    user_id: userId,
    record_status: 1
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.trainerId) {
    where.trainer_id = options.trainerId;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: options.include || []
  });
};

DietPlan.createPlan = async function(planData, mealsData = []) {
  const transaction = await sequelize.transaction();
  
  try {
    // Validate trainer role if trainer is provided
    if (planData.trainer_id) {
      const User = require('./User');
      const trainer = await User.findByPk(planData.trainer_id);
      
      if (!trainer || trainer.role !== 3) {
        throw new Error('User is not a trainer');
      }
    }

    // Create diet plan
    const dietPlan = await this.create({
      trainer_id: planData.trainer_id,
      user_id: planData.user_id,
      title: planData.title,
      description: planData.description,
      calories: planData.calories,
      protein_g: planData.protein_g,
      carbs_g: planData.carbs_g,
      fats_g: planData.fats_g
    }, { transaction });

    // Create meals if provided
    const DietPlanMeal = require('./DietPlanMeal');
    const meals = [];
    
    for (const mealData of mealsData) {
      const meal = await DietPlanMeal.create({
        plan_id: dietPlan.id,
        meal_type: mealData.meal_type,
        meal_description: mealData.meal_description
      }, { transaction });
      
      meals.push(meal);
    }

    await transaction.commit();
    
    // Return plan with meals
    dietPlan.dataValues.meals = meals;
    return dietPlan;
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

DietPlan.getTrainerPlanStats = async function(trainerId, options = {}) {
  const where = {
    trainer_id: trainerId,
    record_status: 1
  };

  if (options.startDate && options.endDate) {
    where.created_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate + ' 00:00:00', options.endDate + ' 23:59:59']
    };
  }

  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_plans'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "active" THEN 1 END')), 'active_plans'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "archived" THEN 1 END')), 'archived_plans'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT user_id')), 'unique_clients']
    ],
    where,
    raw: true
  });

  return stats[0];
};

DietPlan.getUserPlanHistory = async function(userId, options = {}) {
  const where = {
    user_id: userId,
    record_status: 1
  };

  if (options.trainerId) {
    where.trainer_id = options.trainerId;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: require('./User'),
        as: 'trainer',
        attributes: ['id', 'username', 'email']
      }
    ]
  });
};

DietPlan.getPopularPlans = async function(limit = 10) {
  // Find plans with most users (if a trainer creates similar plans for multiple users)
  const popularPlans = await this.findAll({
    attributes: [
      'title',
      'trainer_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'usage_count']
    ],
    where: {
      record_status: 1,
      status: 'active'
    },
    group: ['title', 'trainer_id'],
    order: [[sequelize.literal('usage_count'), 'DESC']],
    limit,
    raw: true
  });

  return popularPlans;
};

module.exports = DietPlan;
