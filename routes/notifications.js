const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { body, param, query } = require('express-validator');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the notification
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message content
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, promotion, reminder]
 *           description: Notification type
 *         category:
 *           type: string
 *           enum: [subscription, class, workout, payment, system, promotion, reminder, security]
 *           description: Notification category
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: Notification priority
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *         actionUrl:
 *           type: string
 *           description: URL to navigate when notification is clicked
 *         iconUrl:
 *           type: string
 *           description: Icon URL for the notification
 *         createTimestamp:
 *           type: string
 *           format: date-time
 *           description: When the notification was created
 *     
 *     PushSubscription:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Subscription identifier
 *         deviceType:
 *           type: string
 *           enum: [desktop, mobile, tablet]
 *           description: Type of device
 *         platform:
 *           type: string
 *           description: Browser platform
 *         lastUsed:
 *           type: string
 *           format: date-time
 *           description: When subscription was last used
 *         createTimestamp:
 *           type: string
 *           format: date-time
 *           description: When subscription was created
 */

// User notification routes

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
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
 *           default: 20
 *         description: Number of notifications per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, promotion, reminder]
 *         description: Filter by notification type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [subscription, class, workout, payment, system, promotion, reminder, security]
 *         description: Filter by notification category
 *       - in: query
 *         name: onlyUnread
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only return unread notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         unreadCount:
 *                           type: integer
 */
router.get('/', NotificationController.getUserNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
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
 *                     unreadCount:
 *                       type: integer
 */
router.get('/unread-count', NotificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 */
router.put('/:notificationId/read', [
  param('notificationId').notEmpty().withMessage('Notification ID is required')
], NotificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
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
 *                     updatedCount:
 *                       type: integer
 */
router.put('/mark-all-read', NotificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete('/:notificationId', [
  param('notificationId').notEmpty().withMessage('Notification ID is required')
], NotificationController.deleteNotification);

// Push subscription routes

/**
 * @swagger
 * /api/notifications/push/subscribe:
 *   post:
 *     summary: Register push notification subscription
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription
 *             properties:
 *               subscription:
 *                 type: object
 *                 required:
 *                   - endpoint
 *                   - keys
 *                 properties:
 *                   endpoint:
 *                     type: string
 *                     description: Push service endpoint
 *                   keys:
 *                     type: object
 *                     required:
 *                       - p256dh
 *                       - auth
 *                     properties:
 *                       p256dh:
 *                         type: string
 *                         description: P256DH key
 *                       auth:
 *                         type: string
 *                         description: Auth key
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   userAgent:
 *                     type: string
 *                     description: Browser user agent
 *     responses:
 *       200:
 *         description: Push subscription registered/updated successfully
 *       201:
 *         description: New push subscription created successfully
 */
router.post('/push/subscribe', [
  body('subscription').isObject().withMessage('Subscription object is required'),
  body('subscription.endpoint').notEmpty().withMessage('Subscription endpoint is required'),
  body('subscription.keys').isObject().withMessage('Subscription keys are required'),
  body('subscription.keys.p256dh').notEmpty().withMessage('P256DH key is required'),
  body('subscription.keys.auth').notEmpty().withMessage('Auth key is required')
], NotificationController.registerPushSubscription);

/**
 * @swagger
 * /api/notifications/push/unsubscribe:
 *   post:
 *     summary: Unregister push notification subscription
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *             properties:
 *               endpoint:
 *                 type: string
 *                 description: Push service endpoint to unsubscribe
 *     responses:
 *       200:
 *         description: Push subscription unregistered successfully
 */
router.post('/push/unsubscribe', [
  body('endpoint').notEmpty().withMessage('Endpoint is required')
], NotificationController.unregisterPushSubscription);

/**
 * @swagger
 * /api/notifications/push/subscriptions:
 *   get:
 *     summary: Get user's push subscriptions
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push subscriptions retrieved successfully
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
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PushSubscription'
 */
router.get('/push/subscriptions', NotificationController.getUserSubscriptions);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 default: "Test Notification"
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 default: "This is a test notification from your Gym PWA!"
 *                 description: Notification message
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error]
 *                 default: "info"
 *                 description: Notification type
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 */
router.post('/test', NotificationController.sendTestNotification);

// Admin routes (requires admin authentication)
router.use(adminAuth);

/**
 * @swagger
 * /api/notifications/admin/create:
 *   post:
 *     summary: Create notification (Admin only)
 *     tags: [Admin - Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, promotion, reminder]
 *                 default: info
 *                 description: Notification type
 *               category:
 *                 type: string
 *                 enum: [subscription, class, workout, payment, system, promotion, reminder, security]
 *                 description: Notification category
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *                 description: Notification priority
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *                 description: Specific user email (optional)
 *               recipientRole:
 *                 type: string
 *                 enum: ['1', '2', '3']
 *                 description: Target user role (1=user, 2=owner, 3=admin)
 *               isGlobal:
 *                 type: boolean
 *                 default: false
 *                 description: Send to all users
 *               gymId:
 *                 type: string
 *                 description: Associated gym ID
 *               actionUrl:
 *                 type: string
 *                 description: URL to navigate when clicked
 *               actionText:
 *                 type: string
 *                 description: Action button text
 *               deliveryChannels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, push, sms]
 *                 default: [push]
 *                 description: Delivery channels
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 description: Schedule notification for later
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Notification expiration date
 *               data:
 *                 type: object
 *                 description: Additional data payload
 *     responses:
 *       201:
 *         description: Notification created successfully
 */
router.post('/admin/create', NotificationController.createNotificationValidation, NotificationController.createNotification);

/**
 * @swagger
 * /api/notifications/admin/all:
 *   get:
 *     summary: Get all notifications (Admin only)
 *     tags: [Admin - Notifications]
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
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, promotion, reminder]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [subscription, class, workout, payment, system, promotion, reminder, security]
 *       - in: query
 *         name: recipientEmail
 *         schema:
 *           type: string
 *           format: email
 *       - in: query
 *         name: isGlobal
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: All notifications retrieved successfully
 */
router.get('/admin/all', NotificationController.getAllNotifications);

/**
 * @swagger
 * /api/notifications/admin/bulk-send:
 *   post:
 *     summary: Send bulk notifications (Admin only)
 *     tags: [Admin - Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, promotion, reminder]
 *                 default: info
 *               category:
 *                 type: string
 *                 enum: [subscription, class, workout, payment, system, promotion, reminder, security]
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *               userEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: Specific user emails (optional if role is specified)
 *               role:
 *                 type: string
 *                 enum: ['1', '2', '3']
 *                 description: Target user role (optional if userEmails is specified)
 *               gymId:
 *                 type: string
 *                 description: Associated gym ID
 *               deliveryChannels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, push, sms]
 *                 default: [push, email]
 *               data:
 *                 type: object
 *                 description: Additional data payload
 *     responses:
 *       200:
 *         description: Bulk notification sent successfully
 */
router.post('/admin/bulk-send', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required')
], NotificationController.sendBulkNotification);

/**
 * @swagger
 * /api/notifications/admin/cleanup:
 *   post:
 *     summary: Clean up expired notifications (Admin only)
 *     tags: [Admin - Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
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
 *                     deletedNotifications:
 *                       type: integer
 *                     deletedSubscriptions:
 *                       type: integer
 */
router.post('/admin/cleanup', NotificationController.cleanupExpiredNotifications);

module.exports = router;
