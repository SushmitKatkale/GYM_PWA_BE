const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminPaymentController = require('../controllers/adminPaymentController');
const vendorConfigController = require('../controllers/vendorConfigController');

// Apply admin auth middleware to all routes
router.use(adminAuth);

/**
 * @swagger
 * tags:
 *   name: Admin Payments
 *   description: Admin payment management endpoints
 */

/**
 * @swagger
 * /api/admin/payments/create-order:
 *   post:
 *     summary: Create Razorpay order with commission calculation
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *               - totalAmount
 *             properties:
 *               subscriptionId:
 *                 type: integer
 *                 description: ID of the subscription
 *               totalAmount:
 *                 type: number
 *                 format: float
 *                 description: Total amount to be paid
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/create-order', adminPaymentController.createPaymentAndInvoice);

/**
 * @swagger
 * /api/admin/vendor-configs:
 *   post:
 *     summary: Create vendor payment configuration
 *     tags: [Admin Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownerEmail
 *               - gymId
 *               - cutValue
 *               - cutType
 *             properties:
 *               ownerEmail:
 *                 type: string
 *                 format: email
 *               gymId:
 *                 type: integer
 *               cutValue:
 *                 type: number
 *                 format: float
 *               cutType:
 *                 type: string
 *                 enum: [percentage, flat]
 *     responses:
 *       201:
 *         description: Vendor configuration created successfully
 */
router.post('/vendor-configs', vendorConfigController.createVendorConfig);

/**
 * @swagger
 * /api/admin/vendor-configs:
 *   get:
 *     summary: Get all vendor configurations with advanced filtering
 *     tags: [Admin Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, pending_verification, completed, rejected]
 *         description: Filter by onboarding status
 *       - in: query
 *         name: razorpayActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by Razorpay active status
 *       - in: query
 *         name: kycStatus
 *         schema:
 *           type: string
 *           enum: [pending, submitted, verified, rejected]
 *         description: Filter by KYC verification status
 *       - in: query
 *         name: razorpayVendorId
 *         schema:
 *           type: string
 *         description: Filter by Razorpay vendor ID (partial matching supported)
 *       - in: query
 *         name: ownerEmail
 *         schema:
 *           type: string
 *         description: Filter by owner email (partial matching supported)
 *       - in: query
 *         name: gymName
 *         schema:
 *           type: string
 *         description: Filter by gym name (partial matching supported)
 *     responses:
 *       200:
 *         description: Vendor configurations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     configs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VendorPaymentConfig'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/vendor-configs', vendorConfigController.getAllVendorConfigs);

/**
 * @swagger
 * /api/admin/vendor-configs/{id}:
 *   get:
 *     summary: Get vendor configuration by ID
 *     tags: [Admin Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vendor configuration retrieved successfully
 *       404:
 *         description: Vendor configuration not found
 */
router.get('/vendor-configs/:id', vendorConfigController.getVendorConfig);

/**
 * @swagger
 * /api/admin/vendor-configs/{id}:
 *   put:
 *     summary: Update vendor configuration
 *     tags: [Admin Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cutValue:
 *                 type: number
 *                 format: float
 *               cutType:
 *                 type: string
 *                 enum: [percentage, flat]
 *     responses:
 *       200:
 *         description: Vendor configuration updated successfully
 */
router.put('/vendor-configs/:id', vendorConfigController.updateVendorConfig);

/**
 * @swagger
 * /api/admin/vendor-configs/{id}/onboard:
 *   post:
 *     summary: Onboard vendor to Razorpay
 *     tags: [Admin Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankDetails
 *             properties:
 *               bankDetails:
 *                 type: object
 *                 required:
 *                   - accountNumber
 *                   - ifsc
 *                   - accountHolderName
 *                   - pan
 *                 properties:
 *                   accountNumber:
 *                     type: string
 *                   ifsc:
 *                     type: string
 *                   accountHolderName:
 *                     type: string
 *                   pan:
 *                     type: string
 *                   gst:
 *                     type: string
 *     responses:
 *       200:
 *         description: Vendor onboarded successfully
 */
router.post('/vendor-configs/:id/onboard', vendorConfigController.onboardVendor);

/**
 * @swagger
 * /api/admin/vendor-configs/{id}/status:
 *   get:
 *     summary: Check vendor account status
 *     tags: [Admin Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vendor status retrieved successfully
 */
router.get('/vendor-configs/:id/status', vendorConfigController.checkVendorStatus);

/**
 * @swagger
 * /api/admin/vendor-configs/{id}/complete:
 *   put:
 *     summary: Update vendor configuration (comprehensive - all fields)
 *     tags: [Admin Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpayVendorId:
 *                 type: string
 *                 description: Razorpay vendor account ID
 *               cutValue:
 *                 type: number
 *                 format: float
 *                 description: Commission value
 *               cutType:
 *                 type: string
 *                 enum: [percentage, flat]
 *                 description: Commission type
 *               isRazorpayActive:
 *                 type: boolean
 *                 description: Whether Razorpay integration is active
 *               onboardingStatus:
 *                 type: string
 *                 enum: [pending, in_progress, pending_verification, completed, rejected]
 *                 description: Vendor onboarding status
 *               onboardingDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date when vendor was onboarded
 *               bankAccountVerified:
 *                 type: boolean
 *                 description: Whether bank account is verified
 *               kycStatus:
 *                 type: string
 *                 enum: [pending, submitted, verified, rejected]
 *                 description: KYC verification status
 *               activeStatus:
 *                 type: boolean
 *                 description: Whether configuration is active
 *               razorpayBankAccountId:
 *                 type: string
 *                 description: Razorpay bank account ID
 *               razorpayStakeholderId:
 *                 type: string
 *                 description: Razorpay stakeholder ID
 *               updatedBy:
 *                 type: string
 *                 description: Email of the user updating the record
 *     responses:
 *       200:
 *         description: Vendor configuration updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Vendor configuration not found
 *       500:
 *         description: Internal server error
 */
router.put('/vendor-configs/:id/complete', vendorConfigController.updateVendorConfigComplete);

/**
 * @swagger
 * /api/admin/search/owners:
 *   get:
 *     summary: Search gym owners for autocomplete
 *     tags: [Admin Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Owners found successfully
 */
router.get('/search/owners', adminPaymentController.searchOwners);

/**
 * @swagger
 * /api/admin/search/gyms:
 *   get:
 *     summary: Search gyms for autocomplete
 *     tags: [Admin Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Gyms found successfully
 */
router.get('/search/gyms', adminPaymentController.searchGyms);

/**
 * @swagger
 * /api/admin/search/subscriptions:
 *   get:
 *     summary: Search subscriptions for autocomplete
 *     tags: [Admin Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Subscriptions found successfully
 */
router.get('/search/subscriptions', adminPaymentController.searchSubscriptions);

// Payment Management Routes
/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get all payments with filtering and pagination
 *     tags: [Admin Payment Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *       - in: query
 *         name: gateway
 *         schema:
 *           type: string
 *           enum: [razorpay, phonepe]
 *       - in: query
 *         name: userEmail
 *         schema:
 *           type: string
 *       - in: query
 *         name: gymName
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/payments', adminPaymentController.getAllPayments);

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Admin Payment Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 */
router.get('/payments/:id', adminPaymentController.getPaymentById);

/**
 * @swagger
 * /api/admin/payments/stats:
 *   get:
 *     summary: Get payment statistics
 *     tags: [Admin Payment Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 */
router.get('/payments/stats', adminPaymentController.getPaymentStats);

// User Subscription Management Routes
/**
 * @swagger
 * /api/admin/user-subscriptions:
 *   get:
 *     summary: Get all user subscriptions with filtering and pagination
 *     tags: [Admin Subscription Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, expiring]
 *       - in: query
 *         name: userEmail
 *         schema:
 *           type: string
 *       - in: query
 *         name: gymName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User subscriptions retrieved successfully
 */
router.get('/user-subscriptions', adminPaymentController.getAllUserSubscriptions);

/**
 * @swagger
 * /api/admin/user-subscriptions/{id}:
 *   get:
 *     summary: Get user subscription details by ID
 *     tags: [Admin Subscription Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User subscription details retrieved successfully
 */
router.get('/user-subscriptions/:id', adminPaymentController.getUserSubscriptionById);

/**
 * @swagger
 * /api/admin/user-subscriptions/stats:
 *   get:
 *     summary: Get user subscription statistics
 *     tags: [Admin Subscription Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User subscription statistics retrieved successfully
 */
router.get('/user-subscriptions/stats', adminPaymentController.getUserSubscriptionStats);

// Refund Management Routes
/**
 * @swagger
 * /api/admin/payments/{paymentId}/refund-check:
 *   get:
 *     summary: Check if payment is eligible for refund
 *     tags: [Admin Refund Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID to check refund eligibility
 *     responses:
 *       200:
 *         description: Refund eligibility check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isRefundable:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     maxRefundAmount:
 *                       type: number
 *                     alreadyRefunded:
 *                       type: number
 *       404:
 *         description: Payment not found
 */
router.get('/payments/:paymentId/refund-check', adminPaymentController.checkPaymentRefundable);

/**
 * @swagger
 * /api/admin/refunds:
 *   get:
 *     summary: Get all refunds with filtering and pagination
 *     tags: [Admin Refund Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *       - in: query
 *         name: userEmail
 *         schema:
 *           type: string
 *       - in: query
 *         name: refundType
 *         schema:
 *           type: string
 *           enum: [full, partial]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Refunds retrieved successfully
 */
router.get('/refunds', adminPaymentController.getAllRefunds);

/**
 * @swagger
 * /api/admin/refunds:
 *   post:
 *     summary: Create a new refund
 *     tags: [Admin Refund Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - refundAmount
 *               - refundReason
 *               - refundType
 *             properties:
 *               paymentId:
 *                 type: integer
 *                 description: ID of the payment to refund
 *               subscriptionId:
 *                 type: integer
 *                 description: ID of the subscription (if applicable)
 *               refundAmount:
 *                 type: number
 *                 format: float
 *                 description: Amount to refund
 *               refundReason:
 *                 type: string
 *                 description: Reason for the refund
 *               refundType:
 *                 type: string
 *                 enum: [full, partial]
 *                 description: Type of refund
 *     responses:
 *       201:
 *         description: Refund created successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Payment not found
 */
router.post('/refunds', adminPaymentController.createRefund);

/**
 * @swagger
 * /api/admin/refunds/initiate-with-gateway:
 *   post:
 *     summary: Initiate refund with payment gateway first, then create refund record (New gateway-first flow)
 *     tags: [Admin Refund Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - refundAmount
 *               - refundReason
 *               - refundType
 *             properties:
 *               paymentId:
 *                 type: integer
 *                 description: ID of the payment to refund
 *               subscriptionId:
 *                 type: integer
 *                 description: ID of the subscription (if applicable)
 *               refundAmount:
 *                 type: number
 *                 format: float
 *                 description: Amount to refund
 *               refundReason:
 *                 type: string
 *                 description: Reason for the refund
 *               refundType:
 *                 type: string
 *                 enum: [full, partial]
 *                 description: Type of refund
 *     responses:
 *       201:
 *         description: Refund initiated successfully with payment gateway
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     refund:
 *                       $ref: '#/components/schemas/Refund'
 *                     gatewayResult:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         gatewayRefundId:
 *                           type: string
 *                         status:
 *                           type: string
 *                         message:
 *                           type: string
 *       400:
 *         description: Invalid request data or gateway refund failed
 *       404:
 *         description: Payment not found
 */
router.post('/refunds/initiate-with-gateway', adminPaymentController.initiateRefundWithGateway);

/**
 * @swagger
 * /api/admin/refunds/{id}:
 *   get:
 *     summary: Get refund details by ID
 *     tags: [Admin Refund Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Refund details retrieved successfully
 *       404:
 *         description: Refund not found
 */
router.get('/refunds/:id', adminPaymentController.getRefundById);

/**
 * @swagger
 * /api/admin/refunds/{id}/status:
 *   put:
 *     summary: Update refund status
 *     tags: [Admin Refund Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, failed, cancelled]
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Refund status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Refund not found
 */
router.put('/refunds/:id/status', adminPaymentController.updateRefundStatus);

/**
 * @swagger
 * /api/admin/refunds/stats:
 *   get:
 *     summary: Get refund statistics
 *     tags: [Admin Refund Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refund statistics retrieved successfully
 */
router.get('/refunds/stats', adminPaymentController.getRefundStats);

module.exports = router;
