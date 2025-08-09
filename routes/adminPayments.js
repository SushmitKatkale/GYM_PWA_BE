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
 *     summary: Get all vendor configurations
 *     tags: [Admin Vendor Management]
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
 *           enum: [pending, in_progress, completed, rejected]
 *     responses:
 *       200:
 *         description: Vendor configurations retrieved successfully
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

module.exports = router;
