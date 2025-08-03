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
const Subscription = require('./Subscription');
const SubscriptionFeature = require('./SubscriptionFeature');
const UserSubscription = require('./UserSubscription');
const Payment = require('./Payment');
const Invoice = require('./Invoice');
const GymSlot = require('./GymSlot');
const SlotAvailability = require('./SlotAvailability');
const UserSlotBooking = require('./UserSlotBooking');
const SlotChangeHistory = require('./SlotChangeHistory');
const SlotWaitlist = require('./SlotWaitlist');

// Define relationships
// Gym-User owner relationship
User.hasMany(Gym, {
  foreignKey: 'ownerId',
  sourceKey: 'email',
  as: 'ownedGyms',
  onDelete: 'SET NULL',
});

Gym.belongsTo(User, {
  foreignKey: 'ownerId',
  targetKey: 'email',
  as: 'owner',
  constraints: false
});

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

// Subscription relationships
Gym.hasMany(Subscription, {
  foreignKey: 'gymId',
  as: 'subscriptions',
  onDelete: 'CASCADE',
});

Subscription.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym',
});

Subscription.hasMany(SubscriptionFeature, {
  foreignKey: 'subscriptionId',
  as: 'features',
  onDelete: 'CASCADE',
});

SubscriptionFeature.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription',
});

// Payment relationships
Payment.hasOne(UserSubscription, {
  foreignKey: 'paymentId',
  as: 'userSubscription',
  onDelete: 'CASCADE',
});

UserSubscription.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment',
});

// Invoice relationships
Payment.hasOne(Invoice, {
  foreignKey: 'paymentId',
  as: 'invoice',
  onDelete: 'CASCADE',
});

Invoice.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment',
});

// UserSubscription to Subscription relationship
UserSubscription.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription',
});

Subscription.hasMany(UserSubscription, {
  foreignKey: 'subscriptionId',
  as: 'userSubscriptions',
  onDelete: 'CASCADE',
});

// Gym Slot relationships
Gym.hasMany(GymSlot, {
  foreignKey: 'gymId',
  as: 'gymSlots',
  onDelete: 'CASCADE',
});

GymSlot.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym',
});

// Slot Availability relationships
GymSlot.hasMany(SlotAvailability, {
  foreignKey: 'gymSlotId',
  as: 'slotAvailability',
  onDelete: 'CASCADE',
});

SlotAvailability.belongsTo(GymSlot, {
  foreignKey: 'gymSlotId',
  as: 'gymSlot',
});

// User Slot Booking relationships
UserSubscription.hasMany(UserSlotBooking, {
  foreignKey: 'userSubscriptionId',
  as: 'slotBookings',
  onDelete: 'CASCADE',
});

UserSlotBooking.belongsTo(UserSubscription, {
  foreignKey: 'userSubscriptionId',
  as: 'userSubscription',
});

GymSlot.hasMany(UserSlotBooking, {
  foreignKey: 'gymSlotId',
  as: 'slotBookings',
  onDelete: 'CASCADE',
});

UserSlotBooking.belongsTo(GymSlot, {
  foreignKey: 'gymSlotId',
  as: 'gymSlot',
});

// Slot Change History relationships
UserSubscription.hasMany(SlotChangeHistory, {
  foreignKey: 'userSubscriptionId',
  as: 'slotChangeHistory',
  onDelete: 'CASCADE',
});

SlotChangeHistory.belongsTo(UserSubscription, {
  foreignKey: 'userSubscriptionId',
  as: 'userSubscription',
});

GymSlot.hasMany(SlotChangeHistory, {
  foreignKey: 'oldGymSlotId',
  as: 'oldSlotChanges',
  onDelete: 'SET NULL',
});

GymSlot.hasMany(SlotChangeHistory, {
  foreignKey: 'newGymSlotId',
  as: 'newSlotChanges',
  onDelete: 'CASCADE',
});

SlotChangeHistory.belongsTo(GymSlot, {
  foreignKey: 'oldGymSlotId',
  as: 'oldGymSlot',
});

SlotChangeHistory.belongsTo(GymSlot, {
  foreignKey: 'newGymSlotId',
  as: 'newGymSlot',
});

// Slot Waitlist relationships
GymSlot.hasMany(SlotWaitlist, {
  foreignKey: 'gymSlotId',
  as: 'waitlist',
  onDelete: 'CASCADE',
});

SlotWaitlist.belongsTo(GymSlot, {
  foreignKey: 'gymSlotId',
  as: 'gymSlot',
});

// Sync models with database (in development)
const syncDatabase = async () => {
  try {
    // Use alter: true in development to modify tables without losing data
    // Only use force: true when you explicitly want to reset the database
    const syncOptions = process.env.NODE_ENV === 'production' ? 
      { alter: false } : 
      { alter: true }; // This modifies tables without dropping data
    
    await sequelize.sync(syncOptions);
    console.log('✅ Database models synchronized successfully.');
    
    // Create a default admin user (only in development)
    if (process.env.NODE_ENV !== 'production') {
      await createDefaultAdmin();
    }
  } catch (error) {
    console.error('❌ Error synchronizing database models:', error.message);
    console.error('Full error:', error);
    
    // If sync fails, try dropping all tables and recreating
    if (error.message.includes('Too many keys') || error.message.includes('ER_TOO_MANY_KEYS')) {
      console.log('🔄 Attempting to fix "too many keys" error by recreating database...');
      try {
        await sequelize.drop();
        await sequelize.sync({ force: false });
        console.log('✅ Database recreated successfully.');
        await createDefaultAdmin();
      } catch (retryError) {
        console.error('❌ Failed to recreate database:', retryError.message);
      }
    }
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
        activeStatus: '1',
        isVerified: true // Admin is pre-verified
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
  Subscription,
  SubscriptionFeature,
  UserSubscription,
  Payment,
  Invoice,
  GymSlot,
  SlotAvailability,
  UserSlotBooking,
  SlotChangeHistory,
  SlotWaitlist,
  syncDatabase,
  testConnection,
};
