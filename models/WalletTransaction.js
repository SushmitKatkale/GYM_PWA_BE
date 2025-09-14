const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
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
  type: {
    type: DataTypes.ENUM('credit', 'debit'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  transactionRef: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'transaction_ref',
    comment: 'Reference to payments.id, attendances.id, etc.'
  },
  transactionRefType: {
    type: DataTypes.ENUM('payment', 'attendance', 'refund', 'manual'),
    allowNull: false,
    defaultValue: 'manual',
    field: 'transaction_ref_type'
  },
  referenceType: {
    type: DataTypes.ENUM('subscription', 'buffer', 'attendance', 'withdrawal'),
    allowNull: false,
    field: 'reference_type'
  },
  referenceId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'reference_id'
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
  tableName: 'wallet_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods
WalletTransaction.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

WalletTransaction.prototype.isCredit = function() {
  return this.type === 'credit';
};

WalletTransaction.prototype.isDebit = function() {
  return this.type === 'debit';
};

WalletTransaction.prototype.getFormattedAmount = function() {
  const sign = this.isCredit() ? '+' : '-';
  return `${sign}₹${parseFloat(this.amount).toFixed(2)}`;
};

// Static methods
WalletTransaction.getWalletTransactions = async function(walletId, options = {}) {
  const where = { walletId };
  
  if (options.type) {
    where.type = options.type;
  }
  
  if (options.referenceType) {
    where.referenceType = options.referenceType;
  }
  
  if (options.startDate && options.endDate) {
    where.createdAt = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  return await this.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: options.limit || 50,
    offset: options.offset || 0
  });
};

WalletTransaction.getTransactionSummary = async function(walletId, options = {}) {
  const where = { walletId };
  
  if (options.startDate && options.endDate) {
    where.createdAt = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  const summary = await this.findAll({
    where,
    attributes: [
      'type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['type'],
    raw: true
  });

  const result = {
    credits: { count: 0, total: 0 },
    debits: { count: 0, total: 0 },
    netAmount: 0
  };

  summary.forEach(item => {
    const count = parseInt(item.count);
    const total = parseFloat(item.total || 0);
    
    if (item.type === 'credit') {
      result.credits = { count, total };
      result.netAmount += total;
    } else if (item.type === 'debit') {
      result.debits = { count, total };
      result.netAmount -= total;
    }
  });

  return result;
};

WalletTransaction.getTransactionsByReference = async function(referenceType, referenceId) {
  return await this.findAll({
    where: { referenceType, referenceId },
    include: [{
      association: 'wallet',
      include: [{
        association: 'owner',
              }]
    }],
    order: [['createdAt', 'DESC']]
  });
};

WalletTransaction.getMonthlyReport = async function(walletId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactions = await this.getWalletTransactions(walletId, {
    startDate,
    endDate
  });

  const summary = await this.getTransactionSummary(walletId, {
    startDate,
    endDate
  });

  const byReferenceType = await this.findAll({
    where: {
      walletId,
      createdAt: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'reference_type',
      'type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['reference_type', 'type'],
    raw: true
  });

  const referenceTypeSummary = {};
  byReferenceType.forEach(item => {
    if (!referenceTypeSummary[item.reference_type]) {
      referenceTypeSummary[item.reference_type] = {
        credits: { count: 0, total: 0 },
        debits: { count: 0, total: 0 }
      };
    }
    
    const count = parseInt(item.count);
    const total = parseFloat(item.total || 0);
    
    if (item.type === 'credit') {
      referenceTypeSummary[item.reference_type].credits = { count, total };
    } else {
      referenceTypeSummary[item.reference_type].debits = { count, total };
    }
  });

  return {
    period: { year, month, startDate, endDate },
    transactions,
    summary,
    byReferenceType: referenceTypeSummary
  };
};

WalletTransaction.createTransaction = async function(walletId, type, amount, description, referenceType, referenceId) {
  return await this.create({
    walletId,
    type,
    amount: parseFloat(amount),
    description,
    referenceType,
    referenceId
  });
};

WalletTransaction.bulkCreateTransactions = async function(transactions) {
  const validTransactions = transactions.map(tx => ({
    walletId: tx.walletId,
    type: tx.type,
    amount: parseFloat(tx.amount),
    description: tx.description,
    referenceType: tx.referenceType,
    referenceId: tx.referenceId
  }));

  return await this.bulkCreate(validTransactions);
};

// Associations will be defined in models/index.js
WalletTransaction.associate = function(models) {
  WalletTransaction.belongsTo(models.Wallet, {
    foreignKey: 'walletId',
    as: 'wallet'
  });
};

module.exports = WalletTransaction;
