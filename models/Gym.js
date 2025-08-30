const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Gym = sequelize.define('Gym', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true
    }
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
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'zip_code'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
    validate: {
      min: -180,
      max: 180
    }
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  websiteUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'website_url',
    validate: {
      isUrl: true
    }
  },
  gstNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'gst_number'
  },
  registrationNo: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'registration_no'
  },
  openingTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'opening_time'
  },
  closingTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'closing_time'
  },
  daysOpen: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'days_open',
    comment: 'e.g. Mon-Sat, Mon-Sun'
  },
  description: {
    type: DataTypes.TEXT,
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
  },
  recordStatus: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'record_status',
    comment: '1=active, 0=inactive'
  }
}, {
  tableName: 'gyms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = Gym;
