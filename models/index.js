const { sequelize, testConnection } = require('../config/database');

// ========================================
// CORE MODELS (from DB.sql)
// ========================================
const User = require('./User');
const UserProfile = require('./UserProfile');
const UserNotificationSettings = require('./UserNotificationSettings');
const EmergencyContact = require('./EmergencyContact');
const FitnessGoal = require('./FitnessGoal');
const UserFitnessGoal = require('./UserFitnessGoal');

// Gym related
const Gym = require('./Gym');
const GymQRCodes = require('./GymQRCodes');
const GymCheckInMethods = require('./GymCheckInMethods');
const CheckInMethod = require('./CheckInMethod');
const Attendance = require('./Attendance');

// Subscription & Payment
const Subscription = require('./Subscription');
const SubscriptionFeature = require('./SubscriptionFeature');
const UserSubscription = require('./UserSubscription');
const Payment = require('./Payment');
const PaymentItem = require('./PaymentItem');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const Refund = require('./Refund');

// Wallet system
const Wallet = require('./Wallet');
const WalletTransaction = require('./WalletTransaction');
const WithdrawRequest = require('./WithdrawRequest');

// Slot management
const GymSlot = require('./GymSlot');
const UserSlotBooking = require('./UserSlotBooking');
const SlotWaitlist = require('./SlotWaitlist');

// Advertisements & Notifications
const Advertisement = require('./Advertisement');
const AdvertisementAnalytics = require('./AdvertisementAnalytics');
const Notification = require('./Notification');
const PushSubscription = require('./PushSubscription');

// Trainer & Diet system
const GymTrainer = require('./GymTrainer');
const DietPlan = require('./DietPlan');
const DietPlanMeal = require('./DietPlanMeal');
const DietChangeRequest = require('./DietChangeRequest');
const DietPlanHistory = require('./DietPlanHistory');
const Plan = require('./Plan');

const GymAmenity = require('./GymAmenity');
const Feature = require('./Feature');
const GymFeature = require('./GymFeature');
const GymUniqueCodes = require('./GymUniqueCodes');
const SlotAvailability = require('./SlotAvailability');
const SlotChangeHistory = require('./SlotChangeHistory');

// Vendor Payment Config
const VendorPaymentConfig = require('./VendorPaymentConfig');

// Media
const Media = require('./Media');

// Exercise
const Exercise = require('./Exercise');

// Authentication
const RefreshToken = require('./RefreshToken');

// ========================================
// ASSOCIATIONS (simplified)
// ========================================

// User associations
User.hasOne(UserProfile, {
  foreignKey: 'userId',
  as: 'profile',
  onDelete: 'CASCADE'
});

UserProfile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User Notification Settings
User.hasOne(UserNotificationSettings, {
  foreignKey: 'userId',
  as: 'notificationSettings',
  onDelete: 'CASCADE'
});

UserNotificationSettings.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(EmergencyContact, {
  foreignKey: 'userId',
  as: 'emergencyContacts',
  onDelete: 'CASCADE'
});

EmergencyContact.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Fitness Goals
User.belongsToMany(FitnessGoal, {
  through: UserFitnessGoal,
  foreignKey: 'userId',
  otherKey: 'goalId',
  as: 'fitnessGoals'
});

FitnessGoal.belongsToMany(User, {
  through: UserFitnessGoal,
  foreignKey: 'goalId',
  otherKey: 'userId',
  as: 'users'
});

// Gym-User owner relationship
User.hasMany(Gym, {
  foreignKey: 'ownerId',
  as: 'ownedGyms',
  onDelete: 'CASCADE',
});

Gym.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

// Gym-QR Codes
Gym.hasMany(GymQRCodes, {
  foreignKey: 'gymId',
  as: 'qrCodes',
  onDelete: 'CASCADE'
});

GymQRCodes.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym'
});

// Attendance
User.hasMany(Attendance, {
  foreignKey: 'userId',
  as: 'attendances',
  onDelete: 'CASCADE'
});

Attendance.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Gym.hasMany(Attendance, {
  foreignKey: 'gymId',
  as: 'attendances',
  onDelete: 'CASCADE'
});

Attendance.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym'
});

// Subscriptions
Gym.hasMany(Subscription, {
  foreignKey: 'gymId',
  as: 'subscriptions',
  onDelete: 'CASCADE',
});

Subscription.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym',
});

User.hasMany(UserSubscription, {
  foreignKey: 'userId',
  as: 'subscriptions',
  onDelete: 'CASCADE',
});

UserSubscription.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

UserSubscription.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription',
});

// UserSubscription-Payment association
UserSubscription.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment',
});

Payment.hasMany(UserSubscription, {
  foreignKey: 'paymentId',
  as: 'userSubscriptions',
  onDelete: 'CASCADE',
});

// Payments
User.hasMany(Payment, {
  foreignKey: 'userId',
  as: 'payments',
  onDelete: 'CASCADE',
});

Payment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Gym.hasMany(Payment, {
  foreignKey: 'gymId',
  as: 'payments',
  onDelete: 'CASCADE',
});

Payment.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym',
});

// Payment-Subscription association
Payment.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription',
});

Subscription.hasMany(Payment, {
  foreignKey: 'subscriptionId',
  as: 'payments',
  onDelete: 'CASCADE',
});

// Payment Items
Payment.hasMany(PaymentItem, {
  foreignKey: 'paymentId',
  as: 'items',
  onDelete: 'CASCADE',
});

PaymentItem.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment',
});

// Notifications - Updated to support new notification system
// Recipients (who receive notifications)
User.hasMany(Notification, {
  foreignKey: 'recipient_id',
  as: 'receivedNotifications',
  onDelete: 'CASCADE'
});

Notification.belongsTo(User, {
  foreignKey: 'recipient_id',
  as: 'recipient'
});

// Senders (who send notifications)
User.hasMany(Notification, {
  foreignKey: 'sender_id',
  as: 'sentNotifications',
  onDelete: 'SET NULL' // Don't delete notifications if sender is deleted
});

Notification.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender'
});

// Advertisements
Advertisement.hasMany(AdvertisementAnalytics, {
  foreignKey: 'advertisementId',
  as: 'analytics',
  onDelete: 'CASCADE',
});

AdvertisementAnalytics.belongsTo(Advertisement, {
  foreignKey: 'advertisementId',
  as: 'advertisement',
});

// Advertisement-User associations for creator/updater
User.hasMany(Advertisement, {
  foreignKey: 'createdBy',
  as: 'createdAdvertisements',
  onDelete: 'SET NULL'
});

Advertisement.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(Advertisement, {
  foreignKey: 'updatedBy',
  as: 'updatedAdvertisements',
  onDelete: 'SET NULL'
});

Advertisement.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater'
});

// Gym Features (Many-to-Many)
Gym.belongsToMany(Feature, {
  through: GymFeature,
  foreignKey: 'gymId',
  otherKey: 'featureId',
  as: 'features'
});

Feature.belongsToMany(Gym, {
  through: GymFeature,
  foreignKey: 'featureId',
  otherKey: 'gymId',
  as: 'gyms'
});

// Gym Slots
Gym.hasMany(GymSlot, {
  foreignKey: 'gymId',
  as: 'slots',
  onDelete: 'CASCADE'
});

GymSlot.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym'
});

// User Slot Bookings
User.hasMany(UserSlotBooking, {
  foreignKey: 'userId',
  as: 'slotBookings',
  onDelete: 'CASCADE'
});

UserSlotBooking.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

GymSlot.hasMany(UserSlotBooking, {
  foreignKey: 'slotId',
  as: 'bookings',
  onDelete: 'CASCADE'
});

UserSlotBooking.belongsTo(GymSlot, {
  foreignKey: 'slotId',
  as: 'slot'
});

// Slot Waitlist
GymSlot.hasMany(SlotWaitlist, {
  foreignKey: 'slotId',
  as: 'waitlist',
  onDelete: 'CASCADE'
});

SlotWaitlist.belongsTo(GymSlot, {
  foreignKey: 'slotId',
  as: 'slot'
});

User.hasMany(SlotWaitlist, {
  foreignKey: 'userId',
  as: 'waitlistEntries',
  onDelete: 'CASCADE'
});

SlotWaitlist.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Gym Trainers (Many-to-Many through GymTrainer)
Gym.belongsToMany(User, {
  through: GymTrainer,
  foreignKey: 'gymId',
  otherKey: 'trainerId',
  as: 'trainers',
  scope: {
    role: 3 // Only users with trainer role
  }
});

User.belongsToMany(Gym, {
  through: GymTrainer,
  foreignKey: 'trainerId',
  otherKey: 'gymId',
  as: 'assignedGyms'
});

// Diet Plans
User.hasMany(DietPlan, {
  foreignKey: 'trainerId',
  as: 'createdDietPlans',
  onDelete: 'CASCADE'
});

User.hasMany(DietPlan, {
  foreignKey: 'userId',
  as: 'dietPlans',
  onDelete: 'CASCADE'
});

DietPlan.belongsTo(User, {
  foreignKey: 'trainerId',
  as: 'trainer'
});

DietPlan.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Diet Plan Meals
DietPlan.hasMany(DietPlanMeal, {
  foreignKey: 'planId',
  as: 'meals',
  onDelete: 'CASCADE'
});

DietPlanMeal.belongsTo(DietPlan, {
  foreignKey: 'planId',
  as: 'plan'
});

// Diet Change Requests
// User as requester (user_id)
User.hasMany(DietChangeRequest, {
  foreignKey: 'user_id',
  as: 'dietChangeRequests',
  onDelete: 'CASCADE'
});

DietChangeRequest.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User as trainer (trainer_id)
User.hasMany(DietChangeRequest, {
  foreignKey: 'trainer_id',
  as: 'assignedDietChangeRequests',
  onDelete: 'SET NULL'
});

DietChangeRequest.belongsTo(User, {
  foreignKey: 'trainer_id',
  as: 'trainer'
});

// Diet Plan association
DietPlan.hasMany(DietChangeRequest, {
  foreignKey: 'plan_id',
  as: 'changeRequests',
  onDelete: 'CASCADE'
});

DietChangeRequest.belongsTo(DietPlan, {
  foreignKey: 'plan_id',
  as: 'plan'
});

// Diet Plan History associations
// User as changer (changed_by)
User.hasMany(DietPlanHistory, {
  foreignKey: 'changed_by',
  as: 'dietPlanChanges',
  onDelete: 'SET NULL'
});

DietPlanHistory.belongsTo(User, {
  foreignKey: 'changed_by',
  as: 'changer'
});

// Diet Plan association
DietPlan.hasMany(DietPlanHistory, {
  foreignKey: 'plan_id',
  as: 'history',
  onDelete: 'CASCADE'
});

DietPlanHistory.belongsTo(DietPlan, {
  foreignKey: 'plan_id',
  as: 'plan'
});

// Wallet
User.hasOne(Wallet, {
  foreignKey: 'ownerId',
  as: 'wallet',
  onDelete: 'CASCADE',
  scope: {
    ownerType: ['admin', 'owner']
  }
});

Wallet.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

// Wallet Transactions
Wallet.hasMany(WalletTransaction, {
  foreignKey: 'walletId',
  as: 'transactions',
  onDelete: 'CASCADE'
});

WalletTransaction.belongsTo(Wallet, {
  foreignKey: 'walletId',
  as: 'wallet'
});

// Withdraw Requests
User.hasMany(WithdrawRequest, {
  foreignKey: 'ownerId',
  as: 'withdrawRequests',
  onDelete: 'CASCADE'
});

WithdrawRequest.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

Wallet.hasMany(WithdrawRequest, {
  foreignKey: 'walletId',
  as: 'withdrawRequests',
  onDelete: 'CASCADE'
});

WithdrawRequest.belongsTo(Wallet, {
  foreignKey: 'walletId',
  as: 'wallet'
});

// Invoices
User.hasMany(Invoice, {
  foreignKey: 'userId',
  as: 'invoices',
  onDelete: 'CASCADE'
});

Invoice.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Gym.hasMany(Invoice, {
  foreignKey: 'gymId',
  as: 'invoices',
  onDelete: 'CASCADE'
});

Invoice.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym'
});

// Invoice Items
Invoice.hasMany(InvoiceItem, {
  foreignKey: 'invoiceId',
  as: 'items',
  onDelete: 'CASCADE'
});

InvoiceItem.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});

// Refunds
Payment.hasMany(Refund, {
  foreignKey: 'paymentId',
  as: 'refunds',
  onDelete: 'CASCADE'
});

Refund.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment'
});

// Push Subscriptions
User.hasMany(PushSubscription, {
  foreignKey: 'userId',
  as: 'pushSubscriptions',
  onDelete: 'CASCADE'
});

PushSubscription.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Check-in Methods associations
Gym.belongsToMany(CheckInMethod, {
  through: GymCheckInMethods,
  foreignKey: 'gymId',
  otherKey: 'methodId',
  as: 'checkinMethods'
});

CheckInMethod.belongsToMany(Gym, {
  through: GymCheckInMethods,
  foreignKey: 'methodId',
  otherKey: 'gymId',
  as: 'gyms'
});

Attendance.belongsTo(CheckInMethod, {
  foreignKey: 'methodId',
  as: 'checkinMethod'
});

// Gym Amenities association
Gym.hasMany(GymAmenity, {
  foreignKey: 'gymId',
  as: 'amenities',
  onDelete: 'CASCADE'
});

GymAmenity.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym'
});

// Subscription Features association
Subscription.hasMany(SubscriptionFeature, {
  foreignKey: 'subscriptionId',
  as: 'features',
  onDelete: 'CASCADE'
});

SubscriptionFeature.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription'
});

// Refresh Token associations
User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens',
  onDelete: 'CASCADE'
});

RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Exercise associations
// Gym can have many exercises
Gym.hasMany(Exercise, {
  foreignKey: 'gymId',
  as: 'exercises',
  onDelete: 'CASCADE'
});

Exercise.belongsTo(Gym, {
  foreignKey: 'gymId',
  as: 'gym'
});

// User (creator/updater) associations for exercises
User.hasMany(Exercise, {
  foreignKey: 'createdBy',
  as: 'createdExercises',
  onDelete: 'SET NULL'
});

Exercise.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(Exercise, {
  foreignKey: 'updatedBy',
  as: 'updatedExercises',
  onDelete: 'SET NULL'
});

Exercise.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater'
});

// Media associations (polymorphic)
// Note: Media table uses entity_type and entity_id for polymorphic associations
// These would need to be handled programmatically rather than through Sequelize associations

// ========================================
// DATABASE SYNC
// ========================================
const syncDatabase = async () => {
  try {
    console.log('🔄 Synchronizing database models...');
    
    // Use alter: true in development to modify tables without losing data
    const syncOptions = process.env.NODE_ENV === 'production' ? 
      { alter: false } : 
      { alter: true };
    
    // Sync only the Notification model to create the table with new schema
    if (process.env.NODE_ENV !== 'production') {
      try {
        // Create only the notifications table and user_notification_settings table
        await Notification.sync({ force: true });
        await UserNotificationSettings.sync({ force: true });
        console.log('✅ Notifications and UserNotificationSettings tables created successfully');
      } catch (error) {
        console.log('⚠️ Error creating notification tables:', error.message);
      }
    }
    console.log('✅ Database models synchronized successfully.');
    
    // Create defaults (only in development)
    if (process.env.NODE_ENV !== 'production') {
      await createDefaultFitnessGoals();
    }
  } catch (error) {
    console.error('❌ Error synchronizing database models:', error.message);
    throw error;
  }
};

// Create default fitness goals
const createDefaultFitnessGoals = async () => {
  try {
    const goals = [
      { goal_name: 'Weight Loss', description: 'Focus on losing weight and reducing body fat' },
      { goal_name: 'Muscle Building', description: 'Build lean muscle mass and strength' },
      { goal_name: 'Endurance', description: 'Improve cardiovascular endurance and stamina' },
      { goal_name: 'Flexibility', description: 'Enhance flexibility and mobility' },
      { goal_name: 'General Fitness', description: 'Overall health and fitness improvement' },
      { goal_name: 'Strength Training', description: 'Focus on building raw strength' },
      { goal_name: 'Cardio Health', description: 'Improve heart health and cardiovascular system' }
    ];

    for (const goal of goals) {
      await FitnessGoal.findOrCreate({
        where: { goalName: goal.goal_name },
        defaults: { goalName: goal.goal_name, description: goal.description }
      });
    }
    console.log('✅ Default fitness goals initialized');
  } catch (error) {
    console.log('⚠️  Could not create default fitness goals:', error.message);
  }
};

module.exports = {
  sequelize,
  User,
  UserProfile,
  UserNotificationSettings,
  EmergencyContact,
  FitnessGoal,
  UserFitnessGoal,
  Gym,
  GymQRCodes,
  GymCheckInMethods,
  CheckInMethod,
  Attendance,
  Subscription,
  SubscriptionFeature,
  UserSubscription,
  Payment,
  PaymentItem,
  Invoice,
  InvoiceItem,
  Refund,
  Wallet,
  WalletTransaction,
  WithdrawRequest,
  GymSlot,
  UserSlotBooking,
  SlotWaitlist,
  Advertisement,
  AdvertisementAnalytics,
  Notification,
  PushSubscription,
  GymTrainer,
  DietPlan,
  DietPlanMeal,
  DietChangeRequest,
  DietPlanHistory,
  Plan,
  GymAmenity,
  GymFeature,
  GymUniqueCodes,
  SlotAvailability,
  SlotChangeHistory,
  VendorPaymentConfig,
  Media,
  Exercise,
  RefreshToken,
  syncDatabase,
  testConnection
};
