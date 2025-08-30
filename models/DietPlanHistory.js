const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DietPlanHistory = sequelize.define('DietPlanHistory', {
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
  old_data: {
    type: DataTypes.JSON,
    allowNull: false
  },
  changed_by: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  changed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
  tableName: 'diet_plan_history',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['plan_id']
    },
    {
      fields: ['changed_by']
    },
    {
      fields: ['changed_at']
    }
  ]
});

// Instance methods
DietPlanHistory.prototype.getDietPlan = async function() {
  const DietPlan = require('./DietPlan');
  return await DietPlan.findByPk(this.plan_id);
};

DietPlanHistory.prototype.getChangedByUser = async function() {
  const User = require('./User');
  return await User.findByPk(this.changed_by, {
    attributes: ['id', 'email', 'username', 'role']
  });
};

DietPlanHistory.prototype.getChangesSummary = function() {
  const oldData = this.old_data;
  
  const summary = {
    title_changed: false,
    description_changed: false,
    nutritional_info_changed: false,
    status_changed: false,
    meals_changed: false,
    old_values: {},
    change_timestamp: this.changed_at
  };

  // This would require comparison with current data
  // For now, just return what we have
  summary.old_values = {
    title: oldData.title,
    description: oldData.description,
    calories: oldData.calories,
    protein_g: oldData.protein_g,
    carbs_g: oldData.carbs_g,
    fats_g: oldData.fats_g,
    status: oldData.status,
    meal_count: oldData.meals ? oldData.meals.length : 0
  };

  return summary;
};

DietPlanHistory.prototype.restoreToPreviousVersion = async function() {
  const DietPlan = require('./DietPlan');
  const plan = await DietPlan.findByPk(this.plan_id);
  
  if (!plan) {
    throw new Error('Diet plan not found');
  }

  const transaction = await sequelize.transaction();
  
  try {
    const oldData = this.old_data;
    
    // Update the diet plan with old data
    await plan.update({
      title: oldData.title,
      description: oldData.description,
      calories: oldData.calories,
      protein_g: oldData.protein_g,
      carbs_g: oldData.carbs_g,
      fats_g: oldData.fats_g,
      status: oldData.status
    }, { transaction });

    // Restore meals if they exist in the old data
    if (oldData.meals && Array.isArray(oldData.meals)) {
      const DietPlanMeal = require('./DietPlanMeal');
      
      // Remove current meals
      await DietPlanMeal.update(
        { record_status: 0 },
        {
          where: { plan_id: this.plan_id },
          transaction
        }
      );

      // Restore old meals
      for (const mealData of oldData.meals) {
        await DietPlanMeal.create({
          plan_id: this.plan_id,
          meal_type: mealData.meal_type,
          meal_description: mealData.meal_description
        }, { transaction });
      }
    }

    await transaction.commit();
    return plan;
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Static methods
DietPlanHistory.findByPlan = async function(planId, options = {}) {
  const where = {
    plan_id: planId
  };

  if (options.startDate && options.endDate) {
    where.changed_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  return await this.findAll({
    where,
    order: [['changed_at', 'DESC']],
    include: options.include || []
  });
};

DietPlanHistory.findByUser = async function(userId, options = {}) {
  const where = {
    changed_by: userId
  };

  if (options.startDate && options.endDate) {
    where.changed_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  return await this.findAll({
    where,
    order: [['changed_at', 'DESC']],
    include: options.include || []
  });
};

DietPlanHistory.createHistoryEntry = async function(planId, changedBy, customOldData = null) {
  const DietPlan = require('./DietPlan');
  const plan = await DietPlan.findByPk(planId);
  
  if (!plan) {
    throw new Error('Diet plan not found');
  }

  let oldData;
  if (customOldData) {
    oldData = customOldData;
  } else {
    // Capture current state
    const meals = await plan.getMeals();
    oldData = {
      title: plan.title,
      description: plan.description,
      calories: plan.calories,
      protein_g: plan.protein_g,
      carbs_g: plan.carbs_g,
      fats_g: plan.fats_g,
      status: plan.status,
      meals: meals.map(meal => ({
        meal_type: meal.meal_type,
        meal_description: meal.meal_description
      }))
    };
  }

  return await this.create({
    plan_id: planId,
    old_data: oldData,
    changed_by: changedBy
  });
};

DietPlanHistory.getPlanChangeStats = async function(planId) {
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_changes'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT changed_by')), 'unique_editors'],
      [sequelize.fn('MIN', sequelize.col('changed_at')), 'first_change'],
      [sequelize.fn('MAX', sequelize.col('changed_at')), 'last_change']
    ],
    where: {
      plan_id: planId
    },
    raw: true
  });

  return stats[0];
};

DietPlanHistory.getTrainerChangeStats = async function(trainerId, options = {}) {
  const where = {
    changed_by: trainerId
  };

  if (options.startDate && options.endDate) {
    where.changed_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate + ' 00:00:00', options.endDate + ' 23:59:59']
    };
  }

  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_changes'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT plan_id')), 'unique_plans_modified'],
      [sequelize.fn('DATE', sequelize.col('changed_at')), 'change_date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'daily_changes']
    ],
    where,
    group: [sequelize.fn('DATE', sequelize.col('changed_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('changed_at')), 'DESC']],
    raw: true
  });

  return stats;
};

DietPlanHistory.getChangeTimeline = async function(planId, limit = 20) {
  return await this.findAll({
    where: {
      plan_id: planId
    },
    order: [['changed_at', 'DESC']],
    limit,
    include: [{
      model: require('./User'),
      as: 'changer',
      attributes: ['id', 'username', 'email', 'role']
    }]
  });
};

DietPlanHistory.getMostActiveEditors = async function(options = {}) {
  const where = {};

  if (options.startDate && options.endDate) {
    where.changed_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate + ' 00:00:00', options.endDate + ' 23:59:59']
    };
  }

  const activeEditors = await this.findAll({
    attributes: [
      'changed_by',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_changes'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT plan_id')), 'unique_plans']
    ],
    where,
    group: ['changed_by'],
    order: [[sequelize.literal('total_changes'), 'DESC']],
    limit: options.limit || 10,
    include: [{
      model: require('./User'),
      as: 'changer',
      attributes: ['id', 'username', 'email', 'role']
    }],
    raw: false
  });

  return activeEditors;
};

module.exports = DietPlanHistory;
