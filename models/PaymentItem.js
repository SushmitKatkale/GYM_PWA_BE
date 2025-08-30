const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentItem = sequelize.define('PaymentItem', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  paymentId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'payment_id',
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  item_type: {
    type: DataTypes.ENUM('subscription', 'buffer', 'addon'),
    defaultValue: 'subscription'
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
  tableName: 'payment_items',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['payment_id']
    },
    {
      fields: ['item_type']
    }
  ]
});

// Instance methods
PaymentItem.prototype.getPayment = async function() {
  const Payment = require('./Payment');
  return await Payment.findByPk(this.payment_id);
};

PaymentItem.prototype.isSubscriptionItem = function() {
  return this.item_type === 'subscription';
};

PaymentItem.prototype.isBufferItem = function() {
  return this.item_type === 'buffer';
};

PaymentItem.prototype.isAddonItem = function() {
  return this.item_type === 'addon';
};

// Static methods
PaymentItem.findByPayment = async function(paymentId, options = {}) {
  const where = {
    payment_id: paymentId
  };

  if (options.itemType) {
    where.item_type = options.itemType;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'ASC']]
  });
};

PaymentItem.createBulk = async function(paymentId, items) {
  const itemsData = items.map(item => ({
    payment_id: paymentId,
    description: item.description,
    amount: item.amount,
    item_type: item.item_type || 'subscription'
  }));

  return await this.bulkCreate(itemsData);
};

PaymentItem.getItemTypeTotals = async function(paymentId) {
  const totals = await this.findAll({
    attributes: [
      'item_type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'item_count']
    ],
    where: {
      payment_id: paymentId
    },
    group: ['item_type'],
    raw: true
  });

  // Convert to object format for easier access
  const result = {};
  totals.forEach(total => {
    result[total.item_type] = {
      total_amount: parseFloat(total.total_amount) || 0,
      item_count: parseInt(total.item_count) || 0
    };
  });

  return result;
};

PaymentItem.getGymPaymentStats = async function(gymId, startDate, endDate) {
  const Payment = require('./Payment');
  
  const stats = await this.findAll({
    attributes: [
      'item_type',
      [sequelize.fn('SUM', sequelize.col('PaymentItem.amount')), 'total_amount'],
      [sequelize.fn('COUNT', sequelize.col('PaymentItem.id')), 'item_count'],
      [sequelize.fn('AVG', sequelize.col('PaymentItem.amount')), 'average_amount']
    ],
    include: [{
      model: Payment,
      as: 'payment',
      where: {
        gym_id: gymId,
        created_at: {
          [sequelize.Sequelize.Op.between]: [startDate + ' 00:00:00', endDate + ' 23:59:59']
        },
        record_status: 1
      },
      attributes: []
    }],
    group: ['item_type'],
    raw: true
  });

  return stats;
};

module.exports = PaymentItem;
