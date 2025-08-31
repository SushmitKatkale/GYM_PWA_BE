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
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  adType: {
    type: DataTypes.ENUM('banner', 'popup', 'card', 'video', 'carousel'),
    allowNull: false,
    defaultValue: 'banner',
    field: 'ad_type'
  },
  targetAudience: {
    type: DataTypes.ENUM('all', 'members', 'gym_owners', 'specific_gyms', 'location_based'),
    allowNull: false,
    defaultValue: 'all',
    field: 'target_audience'
  },
  targetUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'target_url'
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
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  clicks: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  impressions: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'inactive', 'expired'),
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
      fields: ['ad_type']
    },
    {
      fields: ['start_date', 'end_date']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['target_audience', 'target_gym_id', 'target_location']
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
Advertisement.getActiveAds = async function (targetAudience = 'all', gymId = null, location = null) {
  const where = {
    status: 'active',
    recordStatus: 1
  };

  // Date filtering - only include ads that are currently active
  const now = new Date();
  where[sequelize.Sequelize.Op.or] = [
    { startDate: null },
    { startDate: { [sequelize.Sequelize.Op.lte]: now } }
  ];
  
  where[sequelize.Sequelize.Op.and] = [
    {
      [sequelize.Sequelize.Op.or]: [
        { endDate: null },
        { endDate: { [sequelize.Sequelize.Op.gte]: now } }
      ]
    }
  ];

  // Target audience filtering
  if (targetAudience && targetAudience !== 'all') {
    where[sequelize.Sequelize.Op.or] = [
      { targetAudience: 'all' },
      { targetAudience: targetAudience }
    ];
  }

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
    order: [['priority', 'DESC'], ['created_at', 'DESC']]
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
