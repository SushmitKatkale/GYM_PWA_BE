const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DietChangeRequest = sequelize.define('DietChangeRequest', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  trainer_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  plan_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'diet_plans',
      key: 'id'
    }
  },
  request_type: {
    type: DataTypes.ENUM('general', 'meal_change', 'allergy', 'preference', 'nutrition_adjustment'),
    allowNull: false,
    defaultValue: 'general'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  urgency: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'medium'
  },
  request_text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'approved', 'rejected', 'fulfilled'),
    defaultValue: 'pending'
  },
  trainer_response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  record_status: {
    type: DataTypes.TINYINT,
    defaultValue: 1
  },
  responded_at: {
    type: DataTypes.DATE,
    allowNull: true
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
  tableName: 'diet_change_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['trainer_id']
    },
    {
      fields: ['plan_id']
    },
    {
      fields: ['status']
    }
  ]
});

// Instance methods
DietChangeRequest.prototype.isActive = function () {
  return this.record_status === 1;
};

DietChangeRequest.prototype.isPending = function () {
  return this.status === 'pending' && this.record_status === 1;
};

DietChangeRequest.prototype.approve = async function (trainerResponse = null) {
  this.status = 'approved';
  this.trainer_response = trainerResponse;
  this.responded_at = new Date();
  await this.save();
  return this;
};

DietChangeRequest.prototype.reject = async function (trainerResponse) {
  this.status = 'rejected';
  this.trainer_response = trainerResponse;
  this.responded_at = new Date();
  await this.save();
  return this;
};

DietChangeRequest.prototype.setInProgress = async function (trainerResponse = null) {
  this.status = 'in_progress';
  if (trainerResponse) {
    this.trainer_response = trainerResponse;
  }
  this.responded_at = new Date();
  await this.save();
  return this;
};

DietChangeRequest.prototype.fulfill = async function (trainerResponse = null) {
  this.status = 'fulfilled';
  if (trainerResponse) {
    this.trainer_response = trainerResponse;
  }
  this.responded_at = new Date();
  await this.save();
  return this;
};

DietChangeRequest.prototype.getUserDetails = async function () {
  const User = require('./User');
  return await User.findByPk(this.user_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
          }]
  });
};

DietChangeRequest.prototype.getTrainerDetails = async function () {
  if (!this.trainer_id) return null;
  
  const User = require('./User');
  return await User.findByPk(this.trainer_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
          }]
  });
};

DietChangeRequest.prototype.getDietPlan = async function () {
  if (!this.plan_id) return null;

  const DietPlan = require('./DietPlan');
  return await DietPlan.findByPk(this.plan_id);
};

DietChangeRequest.prototype.getResponseTime = function () {
  if (!this.responded_at || !this.created_at) return null;

  const responseTime = new Date(this.responded_at) - new Date(this.created_at);
  return Math.round(responseTime / (1000 * 60 * 60)); // Hours
};

// Static methods
DietChangeRequest.findByUser = async function (userId, options = {}) {
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

DietChangeRequest.findByTrainer = async function (trainerId, options = {}) {
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

DietChangeRequest.findPendingRequests = async function (trainerId = null) {
  const where = {
    status: 'pending',
    record_status: 1
  };

  if (trainerId) {
    where.trainer_id = trainerId;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'ASC']],
    include: [{
      model: require('./User'),
      as: 'user',
          }]
  });
};

DietChangeRequest.createRequest = async function (requestData) {
  // Validate that user exists and has proper role
  const User = require('./User');
  const user = await User.findByPk(requestData.user_id);

  if (!user || user.role !== 1) {
    throw new Error('Invalid user or user is not a member');
  }

  // Validate trainer if provided
  if (requestData.trainer_id) {
    const trainer = await User.findByPk(requestData.trainer_id);
    if (!trainer || trainer.role !== 3) {
      throw new Error('Invalid trainer or user is not a trainer');
    }
  }

  // Validate diet plan if provided
  if (requestData.plan_id) {
    const DietPlan = require('./DietPlan');
    const plan = await DietPlan.findByPk(requestData.plan_id);

    if (!plan || plan.user_id !== requestData.user_id) {
      throw new Error('Invalid diet plan or plan does not belong to user');
    }
    
    // If trainer is specified, ensure it matches the plan's trainer
    if (requestData.trainer_id && plan.trainer_id !== requestData.trainer_id) {
      throw new Error('Diet plan does not belong to specified trainer');
    }
  }

  const requestObj = {
    user_id: requestData.user_id,
    trainer_id: requestData.trainer_id || null,
    plan_id: requestData.plan_id || null,
    request_type: requestData.request_type || 'general',
    description: requestData.description,
    urgency: requestData.urgency || 'medium'
  };
  
  // Add backward compatibility field
  if (requestData.request_text) {
    requestObj.request_text = requestData.request_text;
  }

  return await this.create(requestObj);
};

DietChangeRequest.getTrainerRequestStats = async function (trainerId, options = {}) {
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
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_requests'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "pending" THEN 1 END')), 'pending_requests'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "approved" THEN 1 END')), 'approved_requests'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "rejected" THEN 1 END')), 'rejected_requests'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "fulfilled" THEN 1 END')), 'fulfilled_requests'],
      [sequelize.fn('AVG', sequelize.literal('CASE WHEN responded_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, responded_at) END')), 'avg_response_time_hours']
    ],
    where,
    raw: true
  });

  return stats[0];
};

DietChangeRequest.getUserRequestHistory = async function (userId, options = {}) {
  const where = {
    user_id: userId,
    record_status: 1
  };

  if (options.startDate && options.endDate) {
    where.created_at = {
      [sequelize.Sequelize.Op.between]: [options.startDate + ' 00:00:00', options.endDate + ' 23:59:59']
    };
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: require('./User'),
        as: 'trainer',
              },
      {
        model: require('./DietPlan'),
        as: 'plan',
              }
    ]
  });
};

DietChangeRequest.getResponseTimeAnalysis = async function (trainerId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const analysis = await this.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col('created_at')), 'request_date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_requests'],
      [sequelize.fn('AVG', sequelize.literal('CASE WHEN responded_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, responded_at) END')), 'avg_response_time'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN responded_at IS NOT NULL THEN 1 END')), 'responded_requests']
    ],
    where: {
      trainer_id: trainerId,
      created_at: {
        [sequelize.Sequelize.Op.gte]: startDate
      },
      record_status: 1
    },
    group: [sequelize.fn('DATE', sequelize.col('created_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
    raw: true
  });

  return analysis;
};

module.exports = DietChangeRequest;
