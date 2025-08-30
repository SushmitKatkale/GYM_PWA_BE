const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Advertisement = sequelize.define('Advertisement', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 150]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  targetUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'target_url'
  },
  type: {
    type: DataTypes.ENUM('banner', 'popup', 'carousel'),
    allowNull: false,
    defaultValue: 'banner'
  },
  targetRole: {
    type: DataTypes.ENUM('all', 'member', 'owner', 'trainer', 'admin'),
    allowNull: false,
    defaultValue: 'all',
    field: 'target_role'
  },
  targetGymId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'target_gym_id',
    references: {
      model: 'gyms',
      key: 'id'
    }
  },
  targetLocation: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'target_location'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 10
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date',
    validate: {
      isAfterStart(value) {
        if (value && this.startDate && new Date(value) <= new Date(this.startDate)) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'expired'),
    defaultValue: 'draft',
    allowNull: false
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
  tableName: 'advertisements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['start_date', 'end_date']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['target_role', 'target_gym_id', 'target_location']
    }
  ]
});

// Instance methods
Advertisement.prototype.isActive = function () {
  const now = new Date();
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);

  return this.status === 'active' && now >= startDate && now <= endDate;
};

Advertisement.prototype.isExpired = function () {
  const now = new Date();
  const endDate = new Date(this.endDate);

  return now > endDate;
};

// Static methods
Advertisement.getActiveAds = async function (userRole = 'all', gymId = null, location = null) {
  const where = {
    status: 'active',
    startDate: {
      [sequelize.Sequelize.Op.lte]: new Date()
    },
    endDate: {
      [sequelize.Sequelize.Op.gte]: new Date()
    }
  };

  // Target role filtering
  where[sequelize.Sequelize.Op.or] = [
    { targetRole: 'all' },
    { targetRole: userRole }
  ];

  // Target gym filtering
  if (gymId) {
    where[sequelize.Sequelize.Op.and] = [
      ...(where[sequelize.Sequelize.Op.and] || []),
      {
        [sequelize.Sequelize.Op.or]: [
          { targetGymId: null },
          { targetGymId: gymId }
        ]
      }
    ];
  }

  // Target location filtering
  if (location) {
    where[sequelize.Sequelize.Op.and] = [
      ...(where[sequelize.Sequelize.Op.and] || []),
      {
        [sequelize.Sequelize.Op.or]: [
          { targetLocation: null },
          { targetLocation: location }
        ]
      }
    ];
  }

  return await this.findAll({
    where,
    order: [['priority', 'DESC'], ['createdAt', 'DESC']]
  });
};

Advertisement.expireOldAds = async function () {
  return await this.update(
    { status: 'expired' },
    {
      where: {
        status: 'active',
        endDate: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    }
  );
};


module.exports = Advertisement;
