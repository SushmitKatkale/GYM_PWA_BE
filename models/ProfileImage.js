const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const ProfileImage = sequelize.define('ProfileImage', {
  id: {
    type: DataTypes.STRING(8),
    primaryKey: true,
    allowNull: false,
    comment: 'Unique alphanumeric identifier for the profile image'
  },
  userId: {
    type: DataTypes.STRING(8),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    field: 'user_id',
    comment: 'Foreign key reference to users table'
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_name',
    comment: 'Original filename when uploaded'
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Stored filename on server'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path',
    comment: 'Full path to the stored image file'
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'file_url',
    comment: 'Public URL to access the image'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'mime_type',
    comment: 'MIME type of the image (e.g., image/jpeg, image/png)'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size',
    comment: 'File size in bytes'
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Image width in pixels'
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Image height in pixels'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether this is the current active profile image'
  },
  uploadSource: {
    type: DataTypes.ENUM('web', 'mobile', 'admin'),
    allowNull: false,
    defaultValue: 'web',
    field: 'upload_source',
    comment: 'Source of the upload'
  },
  createTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'create_timestamp'
  },
  createdBy: {
    type: DataTypes.STRING(8),
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    field: 'created_by'
  },
  updateTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'update_timestamp'
  },
  updatedBy: {
    type: DataTypes.STRING(8),
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    field: 'updated_by'
  }
}, {
  tableName: 'profile_images',
  timestamps: false, // We're using custom timestamp fields
  underscored: true
});

// Associations
ProfileImage.associate = function(models) {
  ProfileImage.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  ProfileImage.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  ProfileImage.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater'
  });
};

// Helper function to generate unique alphanumeric ID
const generateUniqueId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Hooks
ProfileImage.addHook('beforeCreate', async (profileImage) => {
  // Generate unique ID if not provided
  if (!profileImage.id) {
    let uniqueId;
    let isUnique = false;
    while (!isUnique) {
      uniqueId = generateUniqueId();
      const existing = await ProfileImage.findOne({ where: { id: uniqueId } });
      if (!existing) {
        isUnique = true;
      }
    }
    profileImage.id = uniqueId;
  }
  
  // Set timestamps
  profileImage.createTimestamp = new Date();
  profileImage.updateTimestamp = new Date();
  
  // Deactivate other profile images for this user if this one is active
  if (profileImage.isActive) {
    await ProfileImage.update(
      { isActive: false },
      { where: { userId: profileImage.userId, isActive: true } }
    );
  }
});

ProfileImage.addHook('beforeUpdate', async (profileImage) => {
  // Update timestamp
  profileImage.updateTimestamp = new Date();
  
  // Deactivate other profile images for this user if this one is being activated
  if (profileImage.changed('isActive') && profileImage.isActive) {
    await ProfileImage.update(
      { isActive: false },
      { 
        where: { 
          userId: profileImage.userId, 
          isActive: true,
          id: { [Op.ne]: profileImage.id }
        } 
      }
    );
  }
});

// Class methods
ProfileImage.findActiveByUserId = async function(userId) {
  return await this.findOne({
    where: {
      userId,
      isActive: true
    }
  });
};

ProfileImage.findAllByUserId = async function(userId, limit = 10, offset = 0) {
  return await this.findAndCountAll({
    where: { userId },
    limit,
    offset,
    order: [['createTimestamp', 'DESC']]
  });
};

ProfileImage.deactivateAllForUser = async function(userId) {
  return await this.update(
    { isActive: false },
    { where: { userId, isActive: true } }
  );
};

module.exports = ProfileImage;

