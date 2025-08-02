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

// Sync models with database (in development)
const syncDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized successfully.');
    }
  } catch (error) {
    console.error('❌ Error synchronizing database models:', error.message);
  }
};

module.exports = {
  sequelize,
  User,
  RefreshToken,
  syncDatabase,
  testConnection,
};
