const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  trainerId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'trainer_id',
    references: {
      model: 'users',
      key: 'id'
    }
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
  type: {
    type: DataTypes.ENUM('diet', 'workout'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
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
  tableName: 'plans',
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
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['trainer_id', 'user_id', 'type']
    }
  ],
  hooks: {
    beforeUpdate: (plan) => {
      plan.updated_at = new Date();
    }
  }
});

// Instance methods
Plan.prototype.isActive = function() {
  return this.status === 'active' && this.record_status === 1;
};

Plan.prototype.isDietPlan = function() {
  return this.type === 'diet';
};

Plan.prototype.isWorkoutPlan = function() {
  return this.type === 'workout';
};

Plan.prototype.archive = async function() {
  this.status = 'archived';
  await this.save();
  
  // If this is a diet plan, also archive the linked diet_plan
  if (this.isDietPlan()) {
    const DietPlan = require('./DietPlan');
    await DietPlan.update(
      { status: 'archived' },
      {
        where: {
          plan_id: this.id,
          record_status: 1
        }
      }
    );
  }
  
  return this;
};

Plan.prototype.activate = async function() {
  this.status = 'active';
  await this.save();
  
  // If this is a diet plan, also activate the linked diet_plan
  if (this.isDietPlan()) {
    const DietPlan = require('./DietPlan');
    await DietPlan.update(
      { status: 'active' },
      {
        where: {
          plan_id: this.id,
          record_status: 1
        }
      }
    );
  }
  
  return this;
};

Plan.prototype.getTrainerDetails = async function() {
  const User = require('./User');
  return await User.findByPk(this.trainer_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
          }]
  });
};

Plan.prototype.getUserDetails = async function() {
  const User = require('./User');
  return await User.findByPk(this.user_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
          }]
  });
};

Plan.prototype.getLinkedDietPlan = async function() {
  if (!this.isDietPlan()) return null;
  
  const DietPlan = require('./DietPlan');
  return await DietPlan.findOne({
    where: {
      plan_id: this.id,
      record_status: 1
    }
  });
};

Plan.prototype.createLinkedDietPlan = async function(dietPlanData) {
  if (!this.isDietPlan()) {
    throw new Error('Cannot create diet plan for non-diet plan type');
  }
  
  const DietPlan = require('./DietPlan');
  return await DietPlan.create({
    plan_id: this.id,
    trainer_id: this.trainer_id,
    user_id: this.user_id,
    title: dietPlanData.title || this.title,
    description: dietPlanData.description || this.description,
    calories: dietPlanData.calories,
    protein_g: dietPlanData.protein_g,
    carbs_g: dietPlanData.carbs_g,
    fats_g: dietPlanData.fats_g,
    status: this.status
  });
};

// Static methods
Plan.findByTrainer = async function(trainerId, options = {}) {
  const where = {
    trainer_id: trainerId,
    record_status: 1
  };

  if (options.type) {
    where.type = options.type;
  }

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

Plan.findByUser = async function(userId, options = {}) {
  const where = {
    user_id: userId,
    record_status: 1
  };

  if (options.type) {
    where.type = options.type;
  }

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

Plan.findByType = async function(type, options = {}) {
  const where = {
    type: type,
    record_status: 1
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.trainerId) {
    where.trainer_id = options.trainerId;
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

Plan.createPlan = async function(planData) {
  // Validate trainer role
  const User = require('./User');
  const trainer = await User.findByPk(planData.trainer_id);
  
  if (!trainer || trainer.role !== 3) {
    throw new Error('User is not a trainer');
  }

  // Validate user exists
  const user = await User.findByPk(planData.user_id);
  if (!user) {
    throw new Error('User not found');
  }

  const transaction = await sequelize.transaction();
  
  try {
    // Create the generic plan
    const plan = await this.create({
      trainer_id: planData.trainer_id,
      user_id: planData.user_id,
      type: planData.type,
      title: planData.title,
      description: planData.description
    }, { transaction });

    // If it's a diet plan, create the linked diet_plan record
    if (planData.type === 'diet' && planData.diet_details) {
      await plan.createLinkedDietPlan(planData.diet_details);
    }

    await transaction.commit();
    return plan;
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

Plan.getTrainerPlanStats = async function(trainerId, options = {}) {
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
      'type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_plans'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "active" THEN 1 END')), 'active_plans'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "archived" THEN 1 END')), 'archived_plans'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT user_id')), 'unique_clients']
    ],
    where,
    group: ['type'],
    raw: true
  });

  // Convert to object format
  const result = {};
  stats.forEach(stat => {
    result[stat.type] = {
      total_plans: parseInt(stat.total_plans),
      active_plans: parseInt(stat.active_plans),
      archived_plans: parseInt(stat.archived_plans),
      unique_clients: parseInt(stat.unique_clients)
    };
  });

  return result;
};

Plan.getUserPlanSummary = async function(userId, options = {}) {
  const where = {
    user_id: userId,
    record_status: 1
  };

  if (options.status) {
    where.status = options.status;
  }

  const summary = await this.findAll({
    attributes: [
      'type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_plans'],
      [sequelize.fn('MAX', sequelize.col('updated_at')), 'last_updated']
    ],
    where,
    group: ['type'],
    raw: true
  });

  const result = {};
  summary.forEach(item => {
    result[item.type] = {
      total_plans: parseInt(item.total_plans),
      last_updated: item.last_updated
    };
  });

  return result;
};

Plan.getPopularPlanTitles = async function(type, limit = 10) {
  const popularTitles = await this.findAll({
    attributes: [
      'title',
      [sequelize.fn('COUNT', sequelize.col('id')), 'usage_count']
    ],
    where: {
      type: type,
      record_status: 1,
      status: 'active'
    },
    group: ['title'],
    order: [[sequelize.literal('usage_count'), 'DESC']],
    limit,
    raw: true
  });

  return popularTitles;
};

module.exports = Plan;
