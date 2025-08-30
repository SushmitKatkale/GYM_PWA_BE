const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of birth'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  heightCm: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'height_cm',
    validate: {
      min: 0,
      max: 300
    }
  },
  weightKg: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'weight_kg',
    validate: {
      min: 0,
      max: 500
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'user_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods
UserProfile.prototype.calculateAge = function() {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

UserProfile.prototype.getBMI = function() {
  if (!this.heightCm || !this.weightKg) return null;
  const heightInMeters = this.heightCm / 100;
  return (this.weightKg / (heightInMeters * heightInMeters)).toFixed(2);
};

module.exports = UserProfile;
