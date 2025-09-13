const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Exercise = sequelize.define('Exercise', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  exerciseTitle: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'exercise_title',
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 5000]
    }
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 5000]
    }
  },
  youtubeUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'youtube_url',
    validate: {
      isUrl: true,
      isYouTubeUrl(value) {
        if (value && !value.includes('youtube.com') && !value.includes('youtu.be')) {
          throw new Error('Must be a valid YouTube URL');
        }
      }
    }
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'thumbnail_url',
    validate: {
      isUrl: true
    }
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in minutes',
    validate: {
      min: 1,
      max: 300
    }
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false,
    defaultValue: 'beginner'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [['strength', 'cardio', 'flexibility', 'balance', 'sports', 'yoga', 'pilates', 'crossfit', 'bodyweight', 'weightlifting', 'other']]
    }
  },
  muscleGroups: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'muscle_groups',
    comment: 'Array of muscle groups targeted by this exercise',
    validate: {
      isValidMuscleGroups(value) {
        if (value) {
          const validMuscleGroups = [
            'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
            'abs', 'obliques', 'lower_back', 'glutes', 'quadriceps', 
            'hamstrings', 'calves', 'full_body', 'core', 'upper_body', 'lower_body'
          ];
          
          if (!Array.isArray(value) || !value.every(muscle => validMuscleGroups.includes(muscle))) {
            throw new Error('Invalid muscle groups provided');
          }
        }
      }
    }
  },
  equipmentNeeded: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'equipment_needed',
    comment: 'Array of equipment needed for this exercise',
    validate: {
      isValidEquipment(value) {
        if (value) {
          const validEquipment = [
            'none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell',
            'medicine_ball', 'pull_up_bar', 'bench', 'treadmill', 'bike',
            'rowing_machine', 'cable_machine', 'smith_machine', 'yoga_mat',
            'foam_roller', 'stability_ball', 'suspension_trainer', 'other'
          ];
          
          if (!Array.isArray(value) || !value.every(equipment => validEquipment.includes(equipment))) {
            throw new Error('Invalid equipment provided');
          }
        }
      }
    }
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated calories burned per session',
    validate: {
      min: 0,
      max: 2000
    }
  },
  sets: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Recommended number of sets',
    validate: {
      min: 1,
      max: 10
    }
  },
  reps: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Recommended repetitions (e.g., "10-12", "30 seconds", "to failure")'
  },
  restTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'rest_time',
    comment: 'Rest time between sets in seconds',
    validate: {
      min: 0,
      max: 600
    }
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tags for better searchability',
    validate: {
      isValidTags(value) {
        if (value && (!Array.isArray(value) || !value.every(tag => typeof tag === 'string' && tag.length <= 50))) {
          throw new Error('Tags must be an array of strings with max 50 characters each');
        }
      }
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_public',
    comment: 'Whether this exercise is visible to all users'
  },
  gymId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'gym_id',
    references: {
      model: 'gyms',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'If set, this exercise is specific to a gym'
  },
  createdBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'User ID who created this exercise'
  },
  updatedBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'User ID who last updated this exercise'
  },
  recordStatus: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'record_status',
    comment: '1=active, 0=inactive'
  }
}, {
  tableName: 'exercises',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['exercise_title']
    },
    {
      fields: ['category']
    },
    {
      fields: ['difficulty']
    },
    {
      fields: ['gym_id']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['record_status']
    },
    {
      fields: ['is_public']
    },
    {
      fields: ['category', 'difficulty']
    },
    {
      fields: ['is_public', 'record_status']
    }
  ],
  hooks: {
    beforeUpdate: (exercise) => {
      exercise.updated_at = new Date();
    }
  }
});

// Instance methods
Exercise.prototype.isActive = function() {
  return this.recordStatus === 1;
};

Exercise.prototype.isPublicExercise = function() {
  return this.isPublic === true && this.recordStatus === 1;
};

Exercise.prototype.activate = async function() {
  this.recordStatus = 1;
  await this.save();
  return this;
};

Exercise.prototype.deactivate = async function() {
  this.recordStatus = 0;
  await this.save();
  return this;
};

Exercise.prototype.makePublic = async function() {
  this.isPublic = true;
  await this.save();
  return this;
};

Exercise.prototype.makePrivate = async function() {
  this.isPublic = false;
  await this.save();
  return this;
};

Exercise.prototype.getFormattedDuration = function() {
  if (!this.duration) return null;
  
  const minutes = this.duration;
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
};

Exercise.prototype.getYouTubeVideoId = function() {
  if (!this.youtubeUrl) return null;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = this.youtubeUrl.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
};

Exercise.prototype.getYouTubeThumbnail = function(quality = 'mqdefault') {
  const videoId = this.getYouTubeVideoId();
  if (!videoId) return this.thumbnailUrl || null;
  
  // Available qualities: default, mqdefault, hqdefault, sddefault, maxresdefault
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

// Static methods
Exercise.findByCategory = async function(category, options = {}) {
  const where = {
    category,
    record_status: 1
  };
  
  if (options.difficulty) {
    where.difficulty = options.difficulty;
  }
  
  if (options.isPublic !== undefined) {
    where.is_public = options.isPublic;
  }
  
  if (options.gymId) {
    where.gym_id = options.gymId;
  }
  
  return await this.findAll({
    where,
    order: [['exercise_title', 'ASC']],
    include: options.include || []
  });
};

Exercise.findByDifficulty = async function(difficulty, options = {}) {
  const where = {
    difficulty,
    record_status: 1
  };
  
  if (options.category) {
    where.category = options.category;
  }
  
  if (options.isPublic !== undefined) {
    where.is_public = options.isPublic;
  }
  
  return await this.findAll({
    where,
    order: [['exercise_title', 'ASC']],
    include: options.include || []
  });
};

Exercise.findByMuscleGroup = async function(muscleGroup, options = {}) {
  const where = {
    muscle_groups: {
      [sequelize.Sequelize.Op.contains]: muscleGroup
    },
    record_status: 1
  };
  
  if (options.category) {
    where.category = options.category;
  }
  
  if (options.difficulty) {
    where.difficulty = options.difficulty;
  }
  
  if (options.isPublic !== undefined) {
    where.is_public = options.isPublic;
  }
  
  return await this.findAll({
    where,
    order: [['exercise_title', 'ASC']],
    include: options.include || []
  });
};

Exercise.findByEquipment = async function(equipment, options = {}) {
  const where = {
    equipment_needed: {
      [sequelize.Sequelize.Op.contains]: equipment
    },
    record_status: 1
  };
  
  if (options.category) {
    where.category = options.category;
  }
  
  if (options.difficulty) {
    where.difficulty = options.difficulty;
  }
  
  if (options.isPublic !== undefined) {
    where.is_public = options.isPublic;
  }
  
  return await this.findAll({
    where,
    order: [['exercise_title', 'ASC']],
    include: options.include || []
  });
};

Exercise.search = async function(searchTerm, options = {}) {
  const { Op } = sequelize.Sequelize;
  
  const where = {
    [Op.or]: [
      { exercise_title: { [Op.like]: `%${searchTerm}%` } },
      { description: { [Op.like]: `%${searchTerm}%` } },
      { instructions: { [Op.like]: `%${searchTerm}%` } }
    ],
    record_status: 1
  };
  
  if (options.category) {
    where.category = options.category;
  }
  
  if (options.difficulty) {
    where.difficulty = options.difficulty;
  }
  
  if (options.isPublic !== undefined) {
    where.is_public = options.isPublic;
  }
  
  if (options.gymId) {
    where.gym_id = options.gymId;
  }
  
  return await this.findAll({
    where,
    order: [['exercise_title', 'ASC']],
    limit: options.limit || 50,
    offset: options.offset || 0,
    include: options.include || []
  });
};

Exercise.getPopular = async function(limit = 10) {
  // This would need a separate tracking mechanism for popularity
  // For now, we'll return recently created exercises
  return await this.findAll({
    where: {
      record_status: 1,
      is_public: true
    },
    order: [['created_at', 'DESC']],
    limit
  });
};

Exercise.getCategories = async function() {
  const categories = await this.findAll({
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: {
      record_status: 1,
      is_public: true
    },
    group: ['category'],
    order: [[sequelize.literal('count'), 'DESC']]
  });
  
  return categories.map(cat => ({
    category: cat.category,
    count: parseInt(cat.get('count'))
  }));
};

Exercise.getMuscleGroups = async function() {
  // This would require a more complex query to extract muscle groups from JSON
  // For now, return the standard muscle groups
  return [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
    'abs', 'obliques', 'lower_back', 'glutes', 'quadriceps', 
    'hamstrings', 'calves', 'full_body', 'core', 'upper_body', 'lower_body'
  ];
};

Exercise.getEquipmentList = async function() {
  return [
    'none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell',
    'medicine_ball', 'pull_up_bar', 'bench', 'treadmill', 'bike',
    'rowing_machine', 'cable_machine', 'smith_machine', 'yoga_mat',
    'foam_roller', 'stability_ball', 'suspension_trainer', 'other'
  ];
};

module.exports = Exercise;
