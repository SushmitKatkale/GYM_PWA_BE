const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
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
  ownerType: {
    type: DataTypes.ENUM('admin', 'owner'),
    allowNull: false,
    field: 'owner_type'
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
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
  tableName: 'wallets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['owner_id', 'owner_type']
    }
  ]
});

// Instance methods
Wallet.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

Wallet.prototype.hasBalance = function(amount) {
  return parseFloat(this.balance) >= parseFloat(amount);
};

Wallet.prototype.addBalance = async function(amount, description, referenceType, referenceId) {
  const transaction = await sequelize.transaction();
  
  try {
    // Update wallet balance
    this.balance = parseFloat(this.balance) + parseFloat(amount);
    await this.save({ transaction });

    // Create transaction record
    const WalletTransaction = require('./WalletTransaction');
    await WalletTransaction.create({
      walletId: this.id,
      type: 'credit',
      amount: parseFloat(amount),
      description: description || 'Balance added',
      referenceType: referenceType || 'subscription',
      referenceId: referenceId
    }, { transaction });

    await transaction.commit();
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

Wallet.prototype.deductBalance = async function(amount, description, referenceType, referenceId) {
  if (!this.hasBalance(amount)) {
    throw new Error('Insufficient balance');
  }

  const transaction = await sequelize.transaction();
  
  try {
    // Update wallet balance
    this.balance = parseFloat(this.balance) - parseFloat(amount);
    await this.save({ transaction });

    // Create transaction record
    const WalletTransaction = require('./WalletTransaction');
    await WalletTransaction.create({
      walletId: this.id,
      type: 'debit',
      amount: parseFloat(amount),
      description: description || 'Balance deducted',
      referenceType: referenceType || 'withdrawal',
      referenceId: referenceId
    }, { transaction });

    await transaction.commit();
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Static methods
Wallet.findOrCreateWallet = async function(ownerId, ownerType) {
  const [wallet, created] = await this.findOrCreate({
    where: { ownerId, ownerType },
    defaults: { ownerId, ownerType, balance: 0.00 }
  });

  return wallet;
};

Wallet.getWalletBalance = async function(ownerId, ownerType) {
  const wallet = await this.findOne({
    where: { ownerId, ownerType }
  });

  return wallet ? parseFloat(wallet.balance) : 0.00;
};

Wallet.getAllWallets = async function(options = {}) {
  const where = {};
  
  if (options.ownerType) {
    where.ownerType = options.ownerType;
  }

  if (options.minBalance) {
    where.balance = {
      [sequelize.Sequelize.Op.gte]: options.minBalance
    };
  }

  return await this.findAll({
    where,
    include: [{
      association: 'owner',
          }],
    order: [['balance', 'DESC']],
    limit: options.limit || 50,
    offset: options.offset || 0
  });
};

Wallet.getTotalBalance = async function(ownerType = null) {
  const where = {};
  if (ownerType) {
    where.ownerType = ownerType;
  }

  const result = await this.findOne({
    where,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('balance')), 'totalBalance']
    ],
    raw: true
  });

  return parseFloat(result?.totalBalance || 0);
};

Wallet.getWalletStats = async function() {
  const stats = await this.findAll({
    attributes: [
      'owner_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'walletCount'],
      [sequelize.fn('SUM', sequelize.col('balance')), 'totalBalance'],
      [sequelize.fn('AVG', sequelize.col('balance')), 'avgBalance']
    ],
    group: ['owner_type'],
    raw: true
  });

  const result = {
    admin: { walletCount: 0, totalBalance: 0, avgBalance: 0 },
    owner: { walletCount: 0, totalBalance: 0, avgBalance: 0 }
  };

  stats.forEach(stat => {
    result[stat.owner_type] = {
      walletCount: parseInt(stat.walletCount),
      totalBalance: parseFloat(stat.totalBalance || 0),
      avgBalance: parseFloat(stat.avgBalance || 0)
    };
  });

  return result;
};

// Associations will be defined in models/index.js
Wallet.associate = function(models) {
  Wallet.belongsTo(models.User, {
    foreignKey: 'ownerId',
    as: 'owner'
  });

  Wallet.hasMany(models.WalletTransaction, {
    foreignKey: 'walletId',
    as: 'transactions'
  });

  Wallet.hasMany(models.WithdrawRequest, {
    foreignKey: 'walletId',
    as: 'withdrawRequests'
  });
};

module.exports = Wallet;
