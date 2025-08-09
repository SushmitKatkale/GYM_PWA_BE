const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints with Razorpay and PhonePe support
 */

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate payment with automatic gateway selection
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gymId
 *               - subscriptionId
 *               - amount
 *               - userId
 *             properties:
 *               gymId:
 *                 type: integer
 *                 description: ID of the gym
 *               subscriptionId:
 *                 type: integer
 *                 description: ID of the subscription
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Payment amount
 *               userId:
 *                 type: integer
 *                 description: ID of the user making payment
 *     responses:
 *       200:
 *         description: Payment initiated successfully
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
 *                     gateway:
 *                       type: string
 *                       enum: [razorpay, phonepe]
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     paymentUrl:
 *                       type: string
 *                       description: For PhonePe payments
 *                     key:
 *                       type: string
 *                       description: For Razorpay payments
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/initiate', authenticate, paymentController.initiatePayment);

/**
 * @swagger
 * /api/payments/config/{gymId}:
 *   get:
 *     summary: Get payment configuration for a gym
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     responses:
 *       200:
 *         description: Payment configuration retrieved successfully
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
 *                     gymId:
 *                       type: integer
 *                     gateway:
 *                       type: string
 *                       enum: [razorpay, phonepe]
 *                     hasVendorConfig:
 *                       type: boolean
 *                     isRazorpayActive:
 *                       type: boolean
 *       400:
 *         description: Invalid gym ID
 *       500:
 *         description: Internal server error
 */
router.get('/config/:gymId', paymentController.getPaymentConfig);

/**
 * @swagger
 * /api/payments/callback/razorpay:
 *   post:
 *     summary: Handle Razorpay payment callback
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_payment_id
 *               - razorpay_order_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *       400:
 *         description: Invalid callback data
 *       500:
 *         description: Internal server error
 */
router.post('/callback/razorpay', paymentController.handleRazorpayCallback);

/**
 * @swagger
 * /api/payments/callback/phonepe:
 *   post:
 *     summary: Handle PhonePe payment callback/webhook
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *                 description: Base64 encoded response from PhonePe
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 *       500:
 *         description: Internal server error
 */
router.post('/callback/phonepe', paymentController.handlePhonepeCallback);

/**
 * @swagger
 * /api/payments/{paymentId}/status:
 *   get:
 *     summary: Verify payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
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
 *                     paymentId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [pending, completed, failed]
 *                     gateway:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:paymentId/status', authenticate, paymentController.verifyPaymentStatus);

/**
 * @swagger
 * /api/payments/{paymentId}/process-status:
 *   get:
 *     summary: Get comprehensive payment status with post-payment processing
 *     description: This endpoint is used after payment gateway redirect to process payment status and update related database records
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID from the redirect URL
 *     responses:
 *       200:
 *         description: Payment status processed successfully
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
 *                     paymentId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [pending, completed, failed, cancelled]
 *                     gateway:
 *                       type: string
 *                       enum: [razorpay, phonepe]
 *                     amount:
 *                       type: number
 *                     userEmail:
 *                       type: string
 *                     subscription:
 *                       type: object
 *                       description: Subscription details
 *                     gym:
 *                       type: object
 *                       description: Gym details
 *                     userSubscription:
 *                       type: object
 *                       description: Created user subscription (if payment successful)
 *                     message:
 *                       type: string
 *                       description: Human readable status message
 *                     nextAction:
 *                       type: string
 *                       description: Suggested next action for the user
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:paymentId/process-status', paymentController.getPaymentStatusWithProcessing);

/**
 * @swagger
 * /api/payments/user/{userId}:
 *   get:
 *     summary: Get payment history for a user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of payments per page
 *     responses:
 *       200:
 *         description: User payments retrieved successfully
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           gateway:
 *                             type: string
 *                           gym:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
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
 *         description: Invalid user ID
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userEmail', authenticate, paymentController.getUserPayments);

module.exports = router;
