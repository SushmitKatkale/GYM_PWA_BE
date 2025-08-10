const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const UserProfile = require('./UserProfile');
const EmergencyContact = require('./EmergencyContact');
const UserNotificationSettings = require('./UserNotificationSettings');
const UserPrivacySettings = require('./UserPrivacySettings');
const UserAppPreferences = require('./UserAppPreferences');
const FitnessGoal = require('./FitnessGoal');
const UserFitnessGoal = require('./UserFitnessGoal');
const ProfileImage = require('./ProfileImage');

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

// User Profile Extended Data associations
User.hasOne(UserProfile, {
  foreignKey: 'userEmail',
  sourceKey: 'email',
  as: 'profile',
  onDelete: 'CASCADE'
});

UserProfile.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user'
});

// Emergency Contact associations
User.hasMany(EmergencyContact, {
  foreignKey: 'userEmail',
  sourceKey: 'email',
  as: 'emergencyContacts',
  onDelete: 'CASCADE'
});

EmergencyContact.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user'
});

// User Settings associations
User.hasOne(UserNotificationSettings, {
  foreignKey: 'userEmail',
  sourceKey: 'email',
  as: 'notificationSettings',
  onDelete: 'CASCADE'
});

UserNotificationSettings.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user'
});

User.hasOne(UserPrivacySettings, {
  foreignKey: 'userEmail',
  sourceKey: 'email',
  as: 'privacySettings',
  onDelete: 'CASCADE'
});

UserPrivacySettings.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user'
});

User.hasOne(UserAppPreferences, {
  foreignKey: 'userEmail',
  sourceKey: 'email',
  as: 'appPreferences',
  onDelete: 'CASCADE'
});

UserAppPreferences.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user'
});

// Fitness Goals Many-to-Many associations
User.belongsToMany(FitnessGoal, {
  through: UserFitnessGoal,
  foreignKey: 'userEmail',
  otherKey: 'goalId',
  as: 'fitnessGoals'
});

FitnessGoal.belongsToMany(User, {
  through: UserFitnessGoal,
  foreignKey: 'goalId',
  otherKey: 'userEmail',
  as: 'users'
});

// UserFitnessGoal associations
UserFitnessGoal.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user'
});

UserFitnessGoal.belongsTo(FitnessGoal, {
  foreignKey: 'goalId',
  as: 'goal'
});

// ProfileImage associations
User.hasMany(ProfileImage, {
  foreignKey: 'userId',
  as: 'profileImages',
  onDelete: 'CASCADE'
});

User.hasOne(ProfileImage, {
  foreignKey: 'userId',
  as: 'currentProfileImage',
  scope: {
    isActive: true
  }
});

ProfileImage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

ProfileImage.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

ProfileImage.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater'
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
const VendorPaymentConfig = require('./VendorPaymentConfig');
const Advertisement = require('./Advertisement');
const AdvertisementMedia = require('./AdvertisementMedia');
const AdvertisementAnalytics = require('./AdvertisementAnalytics');
const Refund = require('./Refund');
const Notification = require('./Notification');
const PushSubscription = require('./PushSubscription');
// const Review = require('./Review');

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

// Payment to Subscription relationship
Payment.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription',
});

Subscription.hasMany(Payment, {
  foreignKey: 'subscriptionId',
  as: 'payments',
  onDelete: 'CASCADE',
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

// VendorPaymentConfig relationships
Gym.hasMany(VendorPaymentConfig, {
  foreignKey: 'gymId',
  as: 'vendorConfigs',
  onDelete: 'CASCADE',
});

VendorPaymentConfig.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym',
});

User.hasMany(VendorPaymentConfig, {
  foreignKey: 'ownerEmail',
  sourceKey: 'email',
  as: 'vendorConfigs',
  onDelete: 'CASCADE',
});

VendorPaymentConfig.belongsTo(User, {
  foreignKey: 'ownerEmail',
  targetKey: 'email',
  as: 'owner',
});

// Payment to VendorPaymentConfig relationship
Payment.belongsTo(VendorPaymentConfig, {
  foreignKey: 'vendorConfigId',
  as: 'vendorConfig',
});

VendorPaymentConfig.hasMany(Payment, {
  foreignKey: 'vendorConfigId',
  as: 'payments',
  onDelete: 'SET NULL',
});

// Refund relationships
Payment.hasMany(Refund, {
  foreignKey: 'paymentId',
  as: 'refunds',
  onDelete: 'CASCADE',
});

Refund.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment',
});

UserSubscription.hasMany(Refund, {
  foreignKey: 'subscriptionId',
  as: 'refunds',
  onDelete: 'CASCADE',
});

Refund.belongsTo(UserSubscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription',
});

User.hasMany(Refund, {
  foreignKey: 'userEmail',
  sourceKey: 'email',
  as: 'refunds',
  onDelete: 'CASCADE',
});

Refund.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user',
});

// Advertisement relationships
Advertisement.hasMany(AdvertisementMedia, {
  foreignKey: 'advertisementId',
  as: 'media',
  onDelete: 'CASCADE',
});

AdvertisementMedia.belongsTo(Advertisement, {
  foreignKey: 'advertisementId',
  as: 'advertisement',
});

Advertisement.hasMany(AdvertisementAnalytics, {
  foreignKey: 'advertisementId',
  as: 'analytics',
  onDelete: 'CASCADE',
});

AdvertisementAnalytics.belongsTo(Advertisement, {
  foreignKey: 'advertisementId',
  as: 'advertisement',
});

// User relationships for advertisements
User.hasMany(Advertisement, {
  foreignKey: 'createdBy',
  sourceKey: 'id',
  as: 'createdAdvertisements',
  onDelete: 'SET NULL',
});

User.hasMany(Advertisement, {
  foreignKey: 'updatedBy',
  sourceKey: 'id',
  as: 'updatedAdvertisements',
  onDelete: 'SET NULL',
});

Advertisement.belongsTo(User, {
  foreignKey: 'createdBy',
  targetKey: 'id',
  as: 'creator',
  constraints: false
});

Advertisement.belongsTo(User, {
  foreignKey: 'updatedBy',
  targetKey: 'id',
  as: 'updater',
  constraints: false
});

// Notification relationships
User.hasMany(Notification, {
  foreignKey: 'recipientEmail',
  sourceKey: 'email',
  as: 'receivedNotifications',
  onDelete: 'CASCADE'
});

Notification.belongsTo(User, {
  foreignKey: 'recipientEmail',
  targetKey: 'email',
  as: 'recipient'
});

User.hasMany(Notification, {
  foreignKey: 'senderEmail',
  sourceKey: 'email',
  as: 'sentNotifications',
  onDelete: 'SET NULL'
});

Notification.belongsTo(User, {
  foreignKey: 'senderEmail',
  targetKey: 'email',
  as: 'sender'
});

Gym.hasMany(Notification, {
  foreignKey: 'gymId',
  as: 'notifications',
  onDelete: 'CASCADE'
});

Notification.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym'
});

// Push Subscription relationships
User.hasMany(PushSubscription, {
  foreignKey: 'userEmail',
  sourceKey: 'email',
  as: 'pushSubscriptions',
  onDelete: 'CASCADE'
});

PushSubscription.belongsTo(User, {
  foreignKey: 'userEmail',
  targetKey: 'email',
  as: 'user'
});

// Review relationships (temporarily disabled)
// User.hasMany(Review, {
//   foreignKey: 'userEmail',
//   sourceKey: 'email',
//   as: 'reviews',
//   onDelete: 'CASCADE'
// });

// Review.belongsTo(User, {
//   foreignKey: 'userEmail',
//   targetKey: 'email',
//   as: 'user'
// });

// Gym.hasMany(Review, {
//   foreignKey: 'gymId',
//   as: 'reviews',
//   onDelete: 'CASCADE'
// });

// Review.belongsTo(Gym, {
//   foreignKey: 'gymId',
//   as: 'gym'
// });

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
    
    // Create defaults (only in development)
    if (process.env.NODE_ENV !== 'production') {
      await createDefaultAdmin();
      await createDefaultFitnessGoals();
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

// Create default fitness goals
const createDefaultFitnessGoals = async () => {
  try {
    const goals = [
      { goalName: 'Weight Loss', description: 'Focus on losing weight and reducing body fat' },
      { goalName: 'Muscle Building', description: 'Build lean muscle mass and strength' },
      { goalName: 'Endurance', description: 'Improve cardiovascular endurance and stamina' },
      { goalName: 'Flexibility', description: 'Enhance flexibility and mobility' },
      { goalName: 'General Fitness', description: 'Overall health and fitness improvement' },
      { goalName: 'Strength Training', description: 'Focus on building raw strength' },
      { goalName: 'Cardio Health', description: 'Improve heart health and cardiovascular system' }
    ];

    for (const goal of goals) {
      await FitnessGoal.findOrCreate({
        where: { goalName: goal.goalName },
        defaults: goal
      });
    }
    console.log('✅ Default fitness goals initialized');
  } catch (error) {
    console.log('⚠️  Could not create default fitness goals:', error.message);
  }
};

// Create default settings for a user
const createDefaultUserSettings = async (userEmail) => {
  try {
    // Create default notification settings
    await UserNotificationSettings.findOrCreate({
      where: { userEmail },
      defaults: { userEmail }
    });

    // Create default privacy settings
    await UserPrivacySettings.findOrCreate({
      where: { userEmail },
      defaults: { userEmail }
    });

    // Create default app preferences
    await UserAppPreferences.findOrCreate({
      where: { userEmail },
      defaults: { userEmail }
    });

    console.log(`✅ Default settings created for user: ${userEmail}`);
  } catch (error) {
    console.log(`⚠️  Could not create default settings for ${userEmail}:`, error.message);
  }
};

module.exports = {
  sequelize,
  User,
  RefreshToken,
  UserProfile,
  EmergencyContact,
  UserNotificationSettings,
  UserPrivacySettings,
  UserAppPreferences,
  FitnessGoal,
  UserFitnessGoal,
  ProfileImage,
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
  VendorPaymentConfig,
  Refund,
  Notification,
  PushSubscription,
  // Review,
  Advertisement,
  AdvertisementMedia,
  AdvertisementAnalytics,
  syncDatabase,
  testConnection,
  createDefaultAdmin,
  createDefaultFitnessGoals,
  createDefaultUserSettings,
};
