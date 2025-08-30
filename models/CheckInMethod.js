const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CheckInMethod = sequelize.define('CheckInMethod', {
  id: {
    type: DataTypes.TINYINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'e.g., gym_qr_scan, gym_code, quick_checkin, owner_scan_user, fingerprint, face_scan'
  },
  description: {
    type: DataTypes.STRING(150),
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
  tableName: 'checkin_methods',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods
CheckInMethod.prototype.toJSON = function () {
  const values = { ...this.get() };
  return values;
};

// Class methods for seeding default methods
CheckInMethod.seedDefaultMethods = async function () {
  const defaultMethods = [
    {
      name: 'gym_qr_scan',
      description: 'Scan gym QR code'
    },
    {
      name: 'gym_code',
      description: 'Enter gym unique code'
    },
    {
      name: 'quick_checkin',
      description: 'Quick check-in based on location'
    },
    {
      name: 'owner_scan_user',
      description: 'Gym owner scans user QR code'
    },
    {
      name: 'fingerprint',
      description: 'Fingerprint biometric authentication'
    },
    {
      name: 'face_scan',
      description: 'Face recognition biometric authentication'
    }
  ];

  for (const method of defaultMethods) {
    await this.findOrCreate({
      where: { name: method.name },
      defaults: method
    });
  }

  console.log('✅ Default check-in methods seeded');
};

// Associations will be defined in models/index.js
CheckInMethod.associate = function (models) {
  // Gym-specific check-in methods (Many-to-Many through GymCheckInMethods)
  CheckInMethod.belongsToMany(models.Gym, {
    through: models.GymCheckInMethods,
    foreignKey: 'methodId',
    otherKey: 'gymId',
    as: 'gyms'
  });

  // Attendances using this method
  CheckInMethod.hasMany(models.Attendance, {
    foreignKey: 'methodId',
    as: 'attendances'
  });
};

module.exports = CheckInMethod;
