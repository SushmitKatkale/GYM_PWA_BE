const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'invoice_id',
    references: {
      model: 'invoices',
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
  tableName: 'invoice_items',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['invoice_id']
    },
    {
      fields: ['item_type']
    }
  ]
});

// Instance methods
InvoiceItem.prototype.getInvoice = async function() {
  const Invoice = require('./Invoice');
  return await Invoice.findByPk(this.invoice_id);
};

InvoiceItem.prototype.isSubscriptionItem = function() {
  return this.item_type === 'subscription';
};

InvoiceItem.prototype.isBufferItem = function() {
  return this.item_type === 'buffer';
};

InvoiceItem.prototype.isAddonItem = function() {
  return this.item_type === 'addon';
};

// Static methods
InvoiceItem.findByInvoice = async function(invoiceId, options = {}) {
  const where = {
    invoice_id: invoiceId
  };

  if (options.itemType) {
    where.item_type = options.itemType;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'ASC']]
  });
};

InvoiceItem.findByType = async function(itemType, options = {}) {
  const where = {
    item_type: itemType
  };

  if (options.invoiceId) {
    where.invoice_id = options.invoiceId;
  }

  return await this.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: options.include || []
  });
};

InvoiceItem.createBulk = async function(invoiceId, items) {
  const itemsData = items.map(item => ({
    invoice_id: invoiceId,
    description: item.description,
    amount: item.amount,
    item_type: item.item_type || 'subscription'
  }));

  return await this.bulkCreate(itemsData);
};

InvoiceItem.getItemTypeTotals = async function(invoiceId) {
  const totals = await this.findAll({
    attributes: [
      'item_type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'item_count']
    ],
    where: {
      invoice_id: invoiceId
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

InvoiceItem.getGymItemStats = async function(gymId, startDate, endDate) {
  const Invoice = require('./Invoice');
  
  const stats = await this.findAll({
    attributes: [
      'item_type',
      [sequelize.fn('SUM', sequelize.col('InvoiceItem.amount')), 'total_amount'],
      [sequelize.fn('COUNT', sequelize.col('InvoiceItem.id')), 'item_count'],
      [sequelize.fn('AVG', sequelize.col('InvoiceItem.amount')), 'average_amount']
    ],
    include: [{
      model: Invoice,
      as: 'invoice',
      where: {
        gym_id: gymId,
        issued_date: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
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

module.exports = InvoiceItem;
