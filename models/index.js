const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');

// Define associations
User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens',
  onDelete: 'CASCADE',
});

RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Self-referencing associations for User
User.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
  constraints: false
});

User.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater',
  constraints: false
});
const Gym = require('./Gym');
const Amenity = require('./Amenity');
const GymImage = require('./GymImage');

// Define relationships
Gym.hasMany(Amenity, {
  foreignKey: 'gymId',
  as: 'amenities',
  onDelete: 'CASCADE',
});

Amenity.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym',
});

Gym.hasMany(GymImage, {
  foreignKey: 'gymId',
  as: 'images',
  onDelete: 'CASCADE',
});

GymImage.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym',
});

// Sync models with database (in development)
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized successfully.');
    // Create a default admin user
    await createDefaultAdmin();
  } catch (error) {
    console.error('❌ Error synchronizing database models:', error.message);
    console.error('Full error:', error);
  }
};

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ where: { type: '3' } });
    
    if (!adminExists) {
      await User.create({
        id: 'ADMIN001', // Explicitly provide an ID for the admin
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@gym.com',
        password: 'Admin123!',
        type: '3',
        activeStatus: '1'
      });
      console.log('✅ Default admin user created (admin@gym.com / Admin123!)');
    }
  } catch (error) {
    console.log('⚠️  Could not create default admin:', error.message);
  }
};

module.exports = {
  sequelize,
  User,
  RefreshToken,
  Gym,
  Amenity,
  GymImage,
  syncDatabase,
  testConnection,
};
