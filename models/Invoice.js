const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
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
  gym_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'gyms',
      key: 'id'
    }
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  issued_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  tableName: 'invoices',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['gym_id']
    },
    {
      fields: ['invoice_number'],
      unique: true
    },
    {
      fields: ['issued_date']
    }
  ]
});

// Instance methods
Invoice.prototype.isActive = function() {
  return this.record_status === 1;
};

Invoice.prototype.getItems = async function() {
  const InvoiceItem = require('./InvoiceItem');
  return await InvoiceItem.findAll({
    where: {
      invoice_id: this.id
    },
    order: [['created_at', 'ASC']]
  });
};

Invoice.prototype.getTotalAmount = async function() {
  const items = await this.getItems();
  return items.reduce((total, item) => total + parseFloat(item.amount), 0);
};

Invoice.prototype.generateInvoiceNumber = function(gymId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  
  return `INV-${gymId}-${year}${month}${day}-${timestamp}`;
};

Invoice.prototype.getUserDetails = async function() {
  const User = require('./User');
  return await User.findByPk(this.user_id, {
    attributes: ['id', 'email', 'username', 'phone'],
    include: [{
      model: require('./UserProfile'),
      as: 'profile',
      attributes: ['dob', 'gender']
    }]
  });
};

Invoice.prototype.getGymDetails = async function() {
  const Gym = require('./Gym');
  return await Gym.findByPk(this.gym_id, {
    attributes: ['id', 'name', 'address']
  });
};

// Static methods
Invoice.findByUser = async function(userId, options = {}) {
  const where = {
    user_id: userId,
    record_status: 1
  };

  if (options.startDate && options.endDate) {
    where.issued_date = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  return await this.findAll({
    where,
    order: [['issued_date', 'DESC']],
    include: options.include || []
  });
};

Invoice.findByGym = async function(gymId, options = {}) {
  const where = {
    gym_id: gymId,
    record_status: 1
  };

  if (options.startDate && options.endDate) {
    where.issued_date = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate]
    };
  }

  return await this.findAll({
    where,
    order: [['issued_date', 'DESC']],
    include: options.include || []
  });
};

Invoice.createInvoice = async function(invoiceData, items) {
  const transaction = await sequelize.transaction();
  
  try {
    // Generate invoice number
    const invoiceNumber = this.prototype.generateInvoiceNumber(invoiceData.gym_id);
    
    // Calculate total amount from items
    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    // Create invoice
    const invoice = await this.create({
      user_id: invoiceData.user_id,
      gym_id: invoiceData.gym_id,
      invoice_number: invoiceNumber,
      amount: totalAmount,
      issued_date: invoiceData.issued_date || new Date(),
      file_path: invoiceData.file_path
    }, { transaction });

    // Create invoice items
    const InvoiceItem = require('./InvoiceItem');
    const invoiceItems = [];
    
    for (const item of items) {
      const invoiceItem = await InvoiceItem.create({
        invoice_id: invoice.id,
        description: item.description,
        amount: item.amount,
        item_type: item.item_type || 'subscription'
      }, { transaction });
      
      invoiceItems.push(invoiceItem);
    }

    await transaction.commit();
    
    // Return invoice with items
    invoice.dataValues.items = invoiceItems;
    return invoice;
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

Invoice.getMonthlyStats = async function(gymId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_invoices'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
      [sequelize.fn('AVG', sequelize.col('amount')), 'average_amount']
    ],
    where: {
      gym_id: gymId,
      issued_date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      },
      record_status: 1
    },
    raw: true
  });

  return stats[0];
};

Invoice.getDailyStats = async function(gymId, startDate, endDate) {
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col('issued_date')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_invoices'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
    ],
    where: {
      gym_id: gymId,
      issued_date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      },
      record_status: 1
    },
    group: [sequelize.fn('DATE', sequelize.col('issued_date'))],
    order: [[sequelize.fn('DATE', sequelize.col('issued_date')), 'ASC']],
    raw: true
  });

  return stats;
};

module.exports = Invoice;
