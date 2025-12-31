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
    allowNull: true, // NULL until trainer accepts invitation
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // email is now retrieved from User table via trainer_id relationship
  status: {
    type: DataTypes.ENUM('pending', 'active', 'inactive', 'declined'),
    defaultValue: 'pending'
  },
  invitation_token: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true
  },
  invited_by: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  invited_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
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
      unique: true,
      where: {
        trainer_id: { [sequelize.Sequelize.Op.ne]: null }
      }
    },
    // Removed email-based unique constraint since email is now in User table
    {
      fields: ['invitation_token']
    },
    {
      fields: ['invited_by']
    },
    {
      fields: ['status']
    }
  ]
});

// Instance methods
GymTrainer.prototype.isActive = function() {
  return this.record_status === 1 && this.status === 'active';
};

GymTrainer.prototype.isExpired = function() {
  if (!this.expires_at) return false;
  return new Date() > this.expires_at;
};

GymTrainer.prototype.canAccept = function() {
  return this.status === 'pending' && !this.isExpired() && this.record_status === 1;
};

GymTrainer.prototype.acceptInvitation = async function(trainerId) {
  if (!this.canAccept()) {
    throw new Error('Invitation cannot be accepted - expired or invalid status');
  }
  
  this.trainer_id = trainerId;
  this.status = 'active';
  this.joined_at = new Date();
  this.invitation_token = null; // Clear token after use
  
  await this.save();
  return this;
};

GymTrainer.prototype.declineInvitation = async function() {
  if (this.status !== 'pending') {
    throw new Error('Only pending invitations can be declined');
  }
  
  this.status = 'declined';
  this.invitation_token = null; // Clear token
  
  await this.save();
  return this;
};

GymTrainer.prototype.deactivate = async function() {
  this.status = 'inactive';
  await this.save();
  return this;
};

GymTrainer.prototype.activate = async function() {
  if (!this.trainer_id) {
    throw new Error('Cannot activate - no trainer assigned');
  }
  this.status = 'active';
  await this.save();
  return this;
};

GymTrainer.prototype.getGymDetails = async function() {
  const Gym = require('./Gym');
  return await Gym.findByPk(this.gym_id, {
      });
};

GymTrainer.prototype.getTrainerDetails = async function() {
  const User = require('./User');
  return await User.findByPk(this.trainer_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
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

// Static methods for invitations
GymTrainer.findByToken = async function(token) {
  return await this.findOne({
    where: { 
      invitation_token: token,
      record_status: 1 
    },
    include: [
      { 
        model: require('./Gym'), 
        as: 'gym',
        attributes: ['id', 'name', 'address', 'city', 'state']
      },
      { 
        model: require('./User'), 
        as: 'inviter',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

GymTrainer.createInvitation = async function(gymId, email, invitedBy) {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  // Check if there's already a pending invitation for this email to this gym
  const existingInvitation = await this.findOne({
    where: {
      gym_id: gymId,
      email: email,
      status: 'pending',
      record_status: 1
    }
  });
  
  if (existingInvitation) {
    throw new Error('An invitation is already pending for this email');
  }
  
  return await this.create({
    gym_id: gymId,
    email: email,
    invited_by: invitedBy,
    invitation_token: token,
    expires_at: expiresAt,
    status: 'pending'
  });
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
