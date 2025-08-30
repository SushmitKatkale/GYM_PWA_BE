const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymTrainer = sequelize.define('GymTrainer', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  gym_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'gyms',
      key: 'id'
    }
  },
  trainer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  record_status: {
    type: DataTypes.TINYINT,
    defaultValue: 1
  },
  joined_at: {
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
  tableName: 'gym_trainers',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['gym_id']
    },
    {
      fields: ['trainer_id']
    },
    {
      fields: ['gym_id', 'trainer_id'],
      unique: true
    }
  ]
});

// Instance methods
GymTrainer.prototype.isActive = function() {
  return this.record_status === 1;
};

GymTrainer.prototype.getGymDetails = async function() {
  const Gym = require('./Gym');
  return await Gym.findByPk(this.gym_id, {
    attributes: ['id', 'name', 'address', 'owner_id']
  });
};

GymTrainer.prototype.getTrainerDetails = async function() {
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

GymTrainer.prototype.removeTrainer = async function() {
  this.record_status = 0;
  await this.save();
  
  // Also deactivate any active diet plans for this trainer at this gym
  const DietPlan = require('./DietPlan');
  await DietPlan.update(
    { status: 'archived' },
    {
      where: {
        trainer_id: this.trainer_id,
        status: 'active'
      },
      include: [{
        model: require('./User'),
        as: 'user',
        include: [{
          model: require('./UserSubscription'),
          as: 'subscriptions',
          where: {
            record_status: 1
          },
          include: [{
            model: require('./Subscription'),
            as: 'subscription',
            where: {
              gym_id: this.gym_id
            }
          }]
        }]
      }]
    }
  );
  
  return this;
};

// Static methods
GymTrainer.findGymTrainers = async function(gymId, options = {}) {
  const where = {
    gym_id: gymId,
    record_status: 1
  };

  return await this.findAll({
    where,
    order: [['joined_at', 'DESC']],
    include: options.include || []
  });
};

GymTrainer.findTrainerGyms = async function(trainerId, options = {}) {
  const where = {
    trainer_id: trainerId,
    record_status: 1
  };

  return await this.findAll({
    where,
    order: [['joined_at', 'DESC']],
    include: options.include || []
  });
};

GymTrainer.assignTrainerToGym = async function(trainerId, gymId) {
  // Check if user is actually a trainer
  const User = require('./User');
  const trainer = await User.findByPk(trainerId);
  
  if (!trainer || trainer.role !== 3) {
    throw new Error('User is not a trainer');
  }

  // Check if gym exists
  const Gym = require('./Gym');
  const gym = await Gym.findByPk(gymId);
  
  if (!gym || !gym.isActive()) {
    throw new Error('Gym not found or inactive');
  }

  // Check if trainer is already assigned to this gym
  const existing = await this.findOne({
    where: {
      trainer_id: trainerId,
      gym_id: gymId,
      record_status: 1
    }
  });

  if (existing) {
    throw new Error('Trainer is already assigned to this gym');
  }

  // Create assignment
  return await this.create({
    gym_id: gymId,
    trainer_id: trainerId
  });
};

GymTrainer.removeTrainerFromGym = async function(trainerId, gymId) {
  const assignment = await this.findOne({
    where: {
      trainer_id: trainerId,
      gym_id: gymId,
      record_status: 1
    }
  });

  if (!assignment) {
    throw new Error('Trainer assignment not found');
  }

  return await assignment.removeTrainer();
};

GymTrainer.getTrainerStats = async function(trainerId, gymId = null) {
  const DietPlan = require('./DietPlan');
  const where = { trainer_id: trainerId };
  
  if (gymId) {
    // Filter by gym through user subscriptions
    const gymTrainers = await this.findAll({
      where: {
        trainer_id: trainerId,
        gym_id: gymId,
        record_status: 1
      }
    });
    
    if (gymTrainers.length === 0) {
      return {
        active_diet_plans: 0,
        total_diet_plans: 0,
        total_clients: 0
      };
    }
  }

  const [activePlans, totalPlans, uniqueClients] = await Promise.all([
    DietPlan.count({
      where: {
        trainer_id: trainerId,
        status: 'active',
        record_status: 1
      }
    }),
    DietPlan.count({
      where: {
        trainer_id: trainerId,
        record_status: 1
      }
    }),
    DietPlan.count({
      where: {
        trainer_id: trainerId,
        record_status: 1
      },
      distinct: true,
      col: 'user_id'
    })
  ]);

  return {
    active_diet_plans: activePlans,
    total_diet_plans: totalPlans,
    total_clients: uniqueClients
  };
};

GymTrainer.getGymTrainerStats = async function(gymId) {
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_trainers'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN record_status = 1 THEN 1 END')), 'active_trainers']
    ],
    where: {
      gym_id: gymId
    },
    raw: true
  });

  return stats[0];
};

module.exports = GymTrainer;
