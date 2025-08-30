const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'gym_pwa_db',
  // logging: process.env.NODE_ENV === 'development' ? console.log : false,
  logging: false,
  pool: {
    max: 30,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    defaultScope: {
      where: { record_status: 1 }, // ✅ only fetch active by default
    },
    scopes: {
      all: { where: {} }, // ✅ include deleted when needed
    },
  },
});

// 🔹 Add global record_status field automatically
sequelize.addHook('beforeDefine', (attributes) => {
  if (!attributes.record_status) {
    attributes.record_status = {
      type: DataTypes.TINYINT, // 1 = active, 0 = deleted
      allowNull: false,
      defaultValue: 1,
    };
  }
});

// 🔹 Global hooks for audit trail
sequelize.addHook('beforeCreate', (instance, options) => {
  if (options.userId && instance.dataValues) {
    // Handle both naming patterns
    if (instance.dataValues.hasOwnProperty('created_by') || instance.rawAttributes?.created_by) {
      instance.dataValues.created_by = options.userId;
      instance.dataValues.updated_by = options.userId;
    } else if (instance.dataValues.hasOwnProperty('createdBy') || instance.rawAttributes?.createdBy) {
      instance.dataValues.createdBy = options.userId;
      instance.dataValues.updatedBy = options.userId;
    }
  }
});

sequelize.addHook('beforeUpdate', (instance, options) => {
  if (options.userId && instance.dataValues) {
    // Handle both naming patterns
    if (instance.dataValues.hasOwnProperty('updated_by') || instance.rawAttributes?.updated_by) {
      instance.dataValues.updated_by = options.userId;
    } else if (instance.dataValues.hasOwnProperty('updatedBy') || instance.rawAttributes?.updatedBy) {
      instance.dataValues.updatedBy = options.userId;
    }
  }
});

sequelize.addHook('beforeBulkCreate', (instances, options) => {
  if (options.userId && Array.isArray(instances)) {
    instances.forEach(instance => {
      if (instance.dataValues) {
        // Handle both naming patterns
        if (instance.dataValues.hasOwnProperty('created_by') || instance.rawAttributes?.created_by) {
          instance.dataValues.created_by = options.userId;
          instance.dataValues.updated_by = options.userId;
        } else if (instance.dataValues.hasOwnProperty('createdBy') || instance.rawAttributes?.createdBy) {
          instance.dataValues.createdBy = options.userId;
          instance.dataValues.updatedBy = options.userId;
        }
      }
    });
  }
});

sequelize.addHook('beforeBulkUpdate', (options) => {
  if (options.userId) {
    options.attributes = options.attributes || {};
    // Handle both naming patterns - check the model being updated
    options.attributes.updated_by = options.userId;
    options.attributes.updatedBy = options.userId;
  }
});

// 🔹 Override destroy() to soft delete
// 🔹 Add restore() to bring back soft-deleted records
sequelize.addHook('afterDefine', (model) => {
  model.prototype.destroy = async function (options = {}) {
    this.record_status = 0;
    if (options.userId) {
      this.updated_by = options.userId;
    }
    await this.save();
  };

  model.prototype.restore = async function (options = {}) {
    this.record_status = 1;
    if (options.userId) {
      this.updated_by = options.userId;
    }
    await this.save();
  };
});

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    process.exit(1);
  }
};

module.exports = { 
  sequelize, 
  testConnection,
  // Configuration for sequelize-cli
  development: {
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'gym_pwa_db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      defaultScope: { where: { record_status: 1 } },
      scopes: { all: { where: {} } },
    },
  },
  production: {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      defaultScope: { where: { record_status: 1 } },
      scopes: { all: { where: {} } },
    },
  }
};
