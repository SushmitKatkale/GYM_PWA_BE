const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'user_email',
    validate: {
      isEmail: true
    }
  },
  gymId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'gym_id'
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'user_name'
  },
  userAvatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'user_avatar'
  },
  activeStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'active_status'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'create_timestamp'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'created_by'
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'update_timestamp'
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'reviews',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_email', 'gym_id'],
      name: 'unique_user_gym_review'
    },
    {
      fields: ['gym_id', 'create_timestamp'],
      name: 'gym_reviews_by_date'
    },
    {
      fields: ['user_email'],
      name: 'user_reviews_index'
    }
  ],
  hooks: {
    beforeUpdate: (review) => {
      review.updateTimestamp = new Date();
    }
  }
});

module.exports = Review;
