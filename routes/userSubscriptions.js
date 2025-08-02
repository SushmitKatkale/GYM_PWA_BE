const express = require('express');
const router = express.Router();

// Swagger documentation for UserSubscription routes
/**
 * @swagger
 * tags:
 *   name: User Subscriptions
 *   description: User subscription purchase and management endpoints
 */

/**
 * @swagger
 * /api/user-subscriptions:
 *   get:
 *     summary: Get all user subscriptions with pagination
 *     tags: [User Subscriptions]
 *     parameters:
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
 *         description: Number of user subscriptions per page
 *       - in: query
 *         name: userEmail
 *         schema:
 *           type: string
 *         description: Filter by user email
 *       - in: query
 *         name: subscriptionId
 *         schema:
 *           type: integer
 *         description: Filter by subscription ID
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Show only active subscriptions
 *     responses:
 *       200:
 *         description: List of user subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSubscription'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *
 *   post:
 *     summary: Create a new user subscription
 *     tags: [User Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserSubscription'
 *     responses:
 *       201:
 *         description: User subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSubscription'
 *       400:
 *         description: Invalid user subscription data
 *
 * /userSubscriptions/{id}:
 *   get:
 *     summary: Get user subscription by ID
 *     tags: [User Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User subscription ID
 *     responses:
 *       200:
 *         description: Return requested user subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSubscription'
 *       404:
 *         description: User subscription not found
 *
 *   put:
 *     summary: Update a user subscription
 *     tags: [User Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               bufferDays:
 *                 type: integer
 *               activeStatus:
 *                 type: boolean
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: User subscription updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSubscription'
 *       404:
 *         description: User subscription not found
 *
 *   delete:
 *     summary: Delete a user subscription
 *     tags: [User Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User subscription ID
 *     responses:
 *       200:
 *         description: User subscription deleted successfully
 *       404:
 *         description: User subscription not found
 *
 * /userSubscriptions/user/{email}:
 *   get:
 *     summary: Get all subscriptions for a user
 *     tags: [User Subscriptions]
 *     parameters:
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: User email
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Show only active subscriptions
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
 *         description: Number of subscriptions per page
 *     responses:
 *       200:
 *         description: List of user subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSubscription'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *
 * /userSubscriptions/purchase:
 *   post:
 *     summary: Purchase a subscription (transactional)
 *     tags: [User Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseSubscriptionRequest'
 *     responses:
 *       201:
 *         description: Subscription purchased successfully
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
 *                     userSubscription:
 *                       $ref: '#/components/schemas/UserSubscription'
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *                     invoice:
 *                       $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Invalid purchase data
 *       500:
 *         description: Transaction failed
 *
 * /userSubscriptions/active/{email}:
 *   get:
 *     summary: Get currently active subscription for a user
 *     tags: [User Subscriptions]
 *     parameters:
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: User email
 *     responses:
 *       200:
 *         description: Current active subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSubscription'
 *       404:
 *         description: No active subscription found
 *
 * /userSubscriptions/{id}/extend:
 *   put:
 *     summary: Extend subscription validity
 *     tags: [User Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               extensionDays:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of days to extend
 *               reason:
 *                 type: string
 *                 description: Reason for extension
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription extended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSubscription'
 *       404:
 *         description: User subscription not found
 */

// CRUD routes implementation

module.exports = router;
