const express = require('express');
const router = express.Router();
const {
  createSubscriptionFeature,
  getAllSubscriptionFeatures,
  getFeaturesBySubscription,
  getSubscriptionFeatureById,
  updateSubscriptionFeature,
  deleteSubscriptionFeature
} = require('../controllers/subscriptionFeatureController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkSubscriptionFeatureOwnership } = require('../middleware/ownership');
const { Subscription, Gym } = require('../models');
const ResponseUtil = require('../utils/response');

// Middleware to validate subscription ownership for feature creation
const checkSubscriptionOwnershipForCreation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const subscriptionId = req.body.subscriptionId;

    // Admin can create for any subscription
    if (userType === '3') {
      return next();
    }

    // Owner can only create for subscriptions of their own gyms
    if (userType === '2') {
      if (!subscriptionId) {
        return ResponseUtil.error(res, 'Subscription ID is required', 400);
      }

      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['ownerId']
        }]
      });

      if (!subscription) {
        return ResponseUtil.notFoundError(res, 'Subscription not found');
      }

      if (subscription.gym.ownerId !== userId) {
        return ResponseUtil.forbiddenError(res, 'Access denied. You can only create features for your own gym subscriptions');
      }

      return next();
    }

    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Subscription ownership creation check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

/**
 * @swagger
 * /api/subscription-features:
 *   post:
 *     tags: [Subscription Features]
 *     summary: Create a new subscription feature
 *     description: Create a new feature for a specific subscription plan.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubscriptionFeature'
 *     responses:
 *       201:
 *         description: Subscription feature created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Subscription not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, authorize(['admin', 'owner']), checkSubscriptionOwnershipForCreation, createSubscriptionFeature);

/**
 * @swagger
 * /api/subscription-features:
 *   get:
 *     tags: [Subscription Features]
 *     summary: Get all subscription features
 *     description: Retrieve a paginated list of subscription features with optional search and filters.
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
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search string
 *       - in: query
 *         name: subscriptionId
 *         schema:
 *           type: integer
 *         description: Filter by subscription ID
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter active features only
 *     responses:
 *       200:
 *         description: A list of subscription features
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 features:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionFeature'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getAllSubscriptionFeatures);

/**
 * @swagger
 * /api/subscription-features/subscription/{subscriptionId}:
 *   get:
 *     tags: [Subscription Features]
 *     summary: Get features by subscription ID
 *     description: Retrieve all features for a specific subscription.
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter active features only
 *     responses:
 *       200:
 *         description: A list of features for the subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionFeature'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/subscription/:subscriptionId', getFeaturesBySubscription);

/**
 * @swagger
 * /api/subscription-features/{id}:
 *   get:
 *     tags: [Subscription Features]
 *     summary: Get subscription feature by ID
 *     description: Retrieve a specific subscription feature by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feature ID
 *     responses:
 *       200:
 *         description: Feature details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionFeature'
 *       404:
 *         description: Feature not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getSubscriptionFeatureById);

/**
 * @swagger
 * /api/subscription-features/{id}:
 *   put:
 *     tags: [Subscription Features]
 *     summary: Update subscription feature
 *     description: Update subscription feature details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feature ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubscriptionFeature'
 *     responses:
 *       200:
 *         description: Feature updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Feature not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', authenticate, authorize(['admin', 'owner']), checkSubscriptionFeatureOwnership, updateSubscriptionFeature);

/**
 * @swagger
 * /api/subscription-features/{id}:
 *   delete:
 *     tags: [Subscription Features]
 *     summary: Delete subscription feature
 *     description: Soft delete subscription feature by setting active status to false.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feature ID
 *     responses:
 *       200:
 *         description: Feature deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Feature not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, authorize(['admin', 'owner']), checkSubscriptionFeatureOwnership, deleteSubscriptionFeature);

module.exports = router;
