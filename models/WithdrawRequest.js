const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WithdrawRequest = sequelize.define('WithdrawRequest', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  ownerId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'owner_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  walletId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'wallet_id',
    references: {
      model: 'wallets',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  requestedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'requested_at'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at'
  },
  recordStatus: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'record_status',
    comment: '1=active, 0=inactive'
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
  tableName: 'withdraw_requests',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods
WithdrawRequest.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

WithdrawRequest.prototype.isPending = function() {
  return this.status === 'pending';
};

WithdrawRequest.prototype.isApproved = function() {
  return this.status === 'approved';
};

WithdrawRequest.prototype.isRejected = function() {
  return this.status === 'rejected';
};

WithdrawRequest.prototype.isProcessed = function() {
  return this.status === 'processed';
};

WithdrawRequest.prototype.approve = async function(processedBy = null) {
  if (!this.isPending()) {
    throw new Error('Only pending requests can be approved');
  }

  this.status = 'approved';
  this.processedAt = new Date();
  
  return await this.save();
};

WithdrawRequest.prototype.reject = async function(processedBy = null) {
  if (!this.isPending()) {
    throw new Error('Only pending requests can be rejected');
  }

  this.status = 'rejected';
  this.processedAt = new Date();
  
  return await this.save();
};

WithdrawRequest.prototype.markProcessed = async function() {
  if (!this.isApproved()) {
    throw new Error('Only approved requests can be marked as processed');
  }

  const transaction = await sequelize.transaction();
  
  try {
    // Mark request as processed
    this.status = 'processed';
    this.processedAt = new Date();
    await this.save({ transaction });

    // Deduct amount from wallet
    const wallet = await this.getWallet();
    await wallet.deductBalance(
      this.amount,
      `Withdrawal processed - Request #${this.id}`,
      'withdrawal',
      this.id
    );

    await transaction.commit();
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

WithdrawRequest.prototype.getFormattedAmount = function() {
  return `₹${parseFloat(this.amount).toFixed(2)}`;
};

WithdrawRequest.prototype.getDaysSinceRequest = function() {
  const now = new Date();
  const diffTime = Math.abs(now - new Date(this.requestedAt));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static methods
WithdrawRequest.createRequest = async function(ownerId, walletId, amount) {
  // Validate wallet has sufficient balance
  const Wallet = require('./Wallet');
  const wallet = await Wallet.findByPk(walletId);
  
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (!wallet.hasBalance(amount)) {
    throw new Error('Insufficient wallet balance');
  }

  // Check for existing pending requests
  const existingRequest = await this.findOne({
    where: {
      ownerId,
      walletId,
      status: 'pending'
    }
  });

  if (existingRequest) {
    throw new Error('You already have a pending withdrawal request');
  }

  return await this.create({
    ownerId,
    walletId,
    amount: parseFloat(amount)
  });
};

WithdrawRequest.getPendingRequests = async function(options = {}) {
  const where = { status: 'pending' };

  if (options.ownerId) {
    where.ownerId = options.ownerId;
  }

  if (options.minAmount) {
    where.amount = {
      [sequelize.Sequelize.Op.gte]: options.minAmount
    };
  }

  return await this.findAll({
    where,
    include: [
      {
        association: 'owner',
              },
      {
        association: 'wallet',
              }
    ],
    order: [['requestedAt', 'ASC']],
    limit: options.limit || 50,
    offset: options.offset || 0
  });
};

WithdrawRequest.getRequestHistory = async function(ownerId, options = {}) {
  const where = { ownerId };

  if (options.status) {
    where.status = options.status;
  }

  if (options.startDate && options.endDate) {
    where.requestedAt = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  return await this.findAll({
    where,
    include: [{
      association: 'wallet',
          }],
    order: [['requestedAt', 'DESC']],
    limit: options.limit || 20,
    offset: options.offset || 0
  });
};

WithdrawRequest.getRequestStats = async function(options = {}) {
  const where = {};

  if (options.startDate && options.endDate) {
    where.requestedAt = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  const stats = await this.findAll({
    where,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
      [sequelize.fn('AVG', sequelize.col('amount')), 'avgAmount']
    ],
    group: ['status'],
    raw: true
  });

  const result = {
    pending: { count: 0, totalAmount: 0, avgAmount: 0 },
    approved: { count: 0, totalAmount: 0, avgAmount: 0 },
    rejected: { count: 0, totalAmount: 0, avgAmount: 0 },
    processed: { count: 0, totalAmount: 0, avgAmount: 0 }
  };

  stats.forEach(stat => {
    result[stat.status] = {
      count: parseInt(stat.count),
      totalAmount: parseFloat(stat.totalAmount || 0),
      avgAmount: parseFloat(stat.avgAmount || 0)
    };
  });

  return result;
};

WithdrawRequest.bulkApprove = async function(requestIds, processedBy = null) {
  const transaction = await sequelize.transaction();
  
  try {
    const requests = await this.findAll({
      where: {
        id: requestIds,
        status: 'pending'
      },
      transaction
    });

    if (requests.length !== requestIds.length) {
      throw new Error('Some requests are not found or not in pending status');
    }

    for (const request of requests) {
      await request.approve(processedBy);
    }

    await transaction.commit();
    return requests;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

WithdrawRequest.bulkReject = async function(requestIds, processedBy = null) {
  const transaction = await sequelize.transaction();
  
  try {
    const requests = await this.findAll({
      where: {
        id: requestIds,
        status: 'pending'
      },
      transaction
    });

    if (requests.length !== requestIds.length) {
      throw new Error('Some requests are not found or not in pending status');
    }

    for (const request of requests) {
      await request.reject(processedBy);
    }

    await transaction.commit();
    return requests;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Associations will be defined in models/index.js
WithdrawRequest.associate = function(models) {
  WithdrawRequest.belongsTo(models.User, {
    foreignKey: 'ownerId',
    as: 'owner'
  });

  WithdrawRequest.belongsTo(models.Wallet, {
    foreignKey: 'walletId',
    as: 'wallet'
  });
};

module.exports = WithdrawRequest;
