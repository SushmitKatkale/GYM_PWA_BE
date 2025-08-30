# 📋 **API Modernization Plan**

## **Status**: ✅ Phase 1 Complete - Cleaned up obsolete routes

---

## **✅ COMPLETED - Phase 1: Cleanup**

### **Removed Obsolete Routes & Models:**
- ❌ `routes/gymImages.js` → GymImage model (deleted)  
- ❌ `routes/reviews.js` → Review model (deleted)
- ❌ `routes/subscriptionFeatures.js` → SubscriptionFeature model (deleted)
- ❌ `routes/uniqueCodes.js` → GymUniqueCodes model (deleted)
- ✅ Updated `server.js` to remove all references
- ✅ Server running successfully on port 3001

---

## **📊 CURRENT STATE - Available APIs**

### **✅ Core APIs (Working)**
| Route | Model(s) | Status | Description |
|-------|----------|--------|-------------|
| `/api/auth` | User | ✅ | Authentication & JWT |
| `/api/users` | User, UserProfile | ✅ | User management |
| `/api/gyms` | Gym | ✅ | Gym CRUD operations |
| `/api/amenities` | Amenity | ✅ | Amenity management |
| `/api/subscriptions` | Subscription | ✅ | Subscription plans |
| `/api/user-subscriptions` | UserSubscription | ✅ | User subscription management |
| `/api/payments` | Payment, PaymentItem | ✅ | Payment processing |
| `/api/invoices` | Invoice, InvoiceItem | ✅ | Invoice generation |
| `/api/attendance` | Attendance | ✅ | Check-in/Check-out |
| `/api/notifications` | Notification | ✅ | Push notifications |
| `/api/advertisements` | Advertisement, AdvertisementAnalytics | ✅ | Ad management |
| `/api/qr-codes` | GymQRCodes | ✅ | QR code management |
| `/api/checkin-methods` | CheckInMethod, GymCheckInMethods | ✅ | Check-in methods |
| `/api/slots` | GymSlot, UserSlotBooking, SlotWaitlist | ✅ | Slot booking system |
| `/api/upload` | - | ✅ | File upload handling |
| `/api/dashboard` | Multiple | ✅ | Analytics dashboard |
| `/api/owners` | User (role=2) | ✅ | Gym owner operations |
| `/api/admin` | Multiple | ✅ | Admin payment operations |
| `/api/attendance-analytics` | Attendance | ✅ | Attendance reports |

---

## **🚧 TODO - Phase 2: Missing API Routes**

### **Missing Routes for Existing Models:**

#### **💰 Wallet System**
- [ ] `routes/wallets.js` → Wallet model
  - GET `/api/wallets/my-wallet` - Get current user's wallet
  - POST `/api/wallets/create` - Create wallet for gym owner
  - GET `/api/wallets/{id}/transactions` - Get wallet transactions
  
- [ ] `routes/walletTransactions.js` → WalletTransaction model
  - GET `/api/wallet-transactions/{walletId}` - Get transactions by wallet
  - POST `/api/wallet-transactions` - Add transaction
  - GET `/api/wallet-transactions/analytics` - Transaction analytics

- [ ] `routes/withdrawRequests.js` → WithdrawRequest model  
  - POST `/api/withdraw-requests` - Request withdrawal
  - GET `/api/withdraw-requests/my-requests` - Get user's requests
  - PUT `/api/withdraw-requests/{id}/approve` - Admin approve
  - PUT `/api/withdraw-requests/{id}/reject` - Admin reject

#### **🍎 Diet & Trainer System**
- [ ] `routes/gymTrainers.js` → GymTrainer model
  - POST `/api/gym-trainers` - Assign trainer to gym
  - GET `/api/gym-trainers/gym/{gymId}` - Get gym's trainers
  - DELETE `/api/gym-trainers/{id}` - Remove trainer assignment

- [ ] `routes/dietPlans.js` → DietPlan, DietPlanMeal models
  - POST `/api/diet-plans` - Create diet plan
  - GET `/api/diet-plans/my-plans` - Get user's diet plans  
  - GET `/api/diet-plans/created-by-me` - Get trainer's created plans
  - PUT `/api/diet-plans/{id}` - Update diet plan
  - POST `/api/diet-plans/{id}/meals` - Add meals to plan

- [ ] `routes/dietChangeRequests.js` → DietChangeRequest model
  - POST `/api/diet-change-requests` - Request diet change
  - GET `/api/diet-change-requests/my-requests` - Get user's requests
  - GET `/api/diet-change-requests/for-me` - Get trainer's pending requests
  - PUT `/api/diet-change-requests/{id}/respond` - Trainer respond

#### **⚙️ Enhanced Features**
- [ ] `routes/features.js` → Feature, GymFeature models
  - GET `/api/features` - Get all available features
  - POST `/api/features` - Admin create feature
  - POST `/api/gym-features` - Assign feature to gym
  - GET `/api/gym-features/gym/{gymId}` - Get gym's features

- [ ] `routes/emergencyContacts.js` → EmergencyContact model
  - POST `/api/emergency-contacts` - Add emergency contact
  - GET `/api/emergency-contacts/my-contacts` - Get user's contacts
  - PUT `/api/emergency-contacts/{id}` - Update contact
  - DELETE `/api/emergency-contacts/{id}` - Remove contact

- [ ] `routes/fitnessGoals.js` → FitnessGoal, UserFitnessGoal models
  - GET `/api/fitness-goals` - Get all available goals
  - POST `/api/user-fitness-goals` - Add goal for user
  - GET `/api/user-fitness-goals/my-goals` - Get user's goals
  - PUT `/api/user-fitness-goals/{id}` - Update user goal
  - DELETE `/api/user-fitness-goals/{id}` - Remove user goal

#### **💳 Enhanced Payment System**
- [ ] `routes/refunds.js` → Refund model
  - POST `/api/refunds` - Process refund
  - GET `/api/refunds/payment/{paymentId}` - Get refunds for payment
  - PUT `/api/refunds/{id}/status` - Update refund status

#### **🔔 Push Notifications**
- [ ] `routes/pushSubscriptions.js` → PushSubscription model
  - POST `/api/push-subscriptions` - Subscribe to push notifications
  - DELETE `/api/push-subscriptions` - Unsubscribe
  - GET `/api/push-subscriptions/my-subscriptions` - Get user's subscriptions

---

## **🔧 Phase 3: API Enhancements**

### **Existing APIs to Enhance:**

#### **User APIs (routes/users.js)**
- [ ] Add fitness goals management endpoints
- [ ] Add emergency contacts endpoints  
- [ ] Add user statistics/analytics
- [ ] Add user preferences management

#### **Gym APIs (routes/gyms.js)**  
- [ ] Add amenities management (assign/remove amenities)
- [ ] Add features management (assign/remove features)
- [ ] Add trainer management endpoints
- [ ] Add gym analytics endpoints

#### **Payment APIs (routes/payments.js)**
- [ ] Add refund management
- [ ] Add payment analytics
- [ ] Add wallet integration
- [ ] Add commission calculations

#### **Subscription APIs (routes/subscriptions.js)**
- [ ] Add buffer management endpoints
- [ ] Add subscription analytics
- [ ] Add bulk operations

---

## **🚀 Phase 4: Implementation Priority**

### **HIGH PRIORITY (Core Business Logic)**
1. **Wallet System** - Essential for gym owner payouts
2. **Diet & Trainer System** - Key differentiator features  
3. **Enhanced Features & Amenities** - Important for gym listings
4. **Emergency Contacts** - Safety feature

### **MEDIUM PRIORITY (User Experience)**
5. **Fitness Goals** - User engagement
6. **Push Subscriptions** - Notifications
7. **Refunds** - Payment management

### **LOW PRIORITY (Admin/Analytics)**
8. **Enhanced Analytics** - Dashboard improvements
9. **Bulk Operations** - Admin efficiency

---

## **📝 Implementation Guidelines**

### **Route Structure Standard:**
```javascript
// routes/[modelName].js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/[modelName]Controller');

// Standard CRUD operations
router.get('/', controller.getAll);           // GET /api/[model]
router.get('/:id', controller.getById);      // GET /api/[model]/:id
router.post('/', authenticate, controller.create);    // POST /api/[model]
router.put('/:id', authenticate, controller.update);  // PUT /api/[model]/:id
router.delete('/:id', authenticate, controller.delete); // DELETE /api/[model]/:id

module.exports = router;
```

### **Controller Structure Standard:**
```javascript
// controllers/[modelName]Controller.js
const { [ModelName] } = require('../models');
const ResponseUtil = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await [ModelName].findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    ResponseUtil.success(res, 'Data retrieved successfully', {
      items: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.count / limit),
        totalItems: result.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    ResponseUtil.error(res, error.message, 500);
  }
};

module.exports = { getAll, /* other methods */ };
```

---

## **✅ Next Steps**

1. **Choose Priority Routes** - Start with Wallet System
2. **Create Controllers** - Follow standard structure  
3. **Add Route Files** - Use standard CRUD pattern
4. **Update server.js** - Register new routes
5. **Test Endpoints** - Verify functionality
6. **Update Documentation** - Add Swagger docs

---

**Current Status**: Server running ✅ | Obsolete routes removed ✅ | Ready for Phase 2 implementation 🚀
