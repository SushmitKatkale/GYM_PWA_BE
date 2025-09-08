const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { UserSubscription, Subscription, Gym, Payment } = require('../models');
const { Op } = require('sequelize');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserSubscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the user subscription
 *         userEmail:
 *           type: string
 *           description: User's email address
 *         subscriptionId:
 *           type: integer
 *           description: ID of the subscription plan
 *         paymentId:
 *           type: integer
 *           description: ID of the payment record
 *         validFrom:
 *           type: string
 *           format: date-time
 *           description: Start date of the subscription
 *         validTo:
 *           type: string
 *           format: date-time
 *           description: End date of the subscription
 *         bufferDays:
 *           type: integer
 *           description: Buffer days for the subscription
 *         activeStatus:
 *           type: boolean
 *           description: Whether the subscription is active
 *         createTimestamp:
 *           type: string
 *           format: date-time
 *         updateTimestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/user-subscriptions:
 *   get:
 *     tags: [User Subscriptions]
 *     summary: Get user's subscriptions
 *     description: Retrieve all subscriptions for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, all]
 *         description: Filter by subscription status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: Successfully retrieved user subscriptions
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
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserSubscription'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Define specific routes before parameterized routes
/**
 * @swagger
 * /api/user-subscriptions/active:
 *   get:
 *     tags: [User Subscriptions]
 *     summary: Get user's active subscriptions
 *     description: Retrieve all currently active subscriptions for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved active subscriptions
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSubscription'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/active', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const now = new Date();

    const activeSubscriptions = await UserSubscription.findAll({
      where: {
        userEmail,
        activeStatus: true,
        validTo: { [Op.gte]: now }
      },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Gym,
              as: 'gym',
              attributes: ['id', 'name', 'address', 'city']
            }
          ]
        }
      ],
      order: [['validTo', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Active subscriptions retrieved successfully',
      data: activeSubscriptions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching active subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active subscriptions',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/user-subscriptions/history:
 *   get:
 *     tags: [User Subscriptions]
 *     summary: Get user's subscription history
 *     description: Retrieve subscription history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: Successfully retrieved subscription history
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
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserSubscription'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { limit = 20, offset = 0 } = req.query;

    // Get total count
    const totalCount = await UserSubscription.count({
      where: {
        userEmail,
        activeStatus: true
      }
    });

    const subscriptionHistory = await UserSubscription.findAll({
      where: {
        userEmail,
        activeStatus: true
      },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Gym,
              as: 'gym',
              attributes: ['id', 'name', 'address', 'city']
            }
          ]
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentAmount', 'status', 'gateway', 'completedAt']
        }
      ],
      order: [['createTimestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Subscription history retrieved successfully',
      data: {
        history: subscriptionHistory,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription history',
      timestamp: new Date().toISOString()
    });
  }
});

// Route for getting subscriptions by user email
router.get('/user/:userEmail', authenticate, async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    
    // Verify user can access this data (admin or self)
    if (req.user.email !== userEmail && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own subscriptions.',
        timestamp: new Date().toISOString()
      });
    }

    const subscriptions = await UserSubscription.findAll({
      where: {
        userEmail,
        activeStatus: true
      },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Gym,
              as: 'gym',
              attributes: ['id', 'name', 'address', 'city', 'rating']
            }
          ]
        },
        {
          model: Payment,
          as: 'payment',
          attributes: [
            'id', 'paymentAmount', 'status', 'gateway', 
            'paidVia', 'completedAt', 'transactionId'
          ]
        }
      ],
      order: [['createTimestamp', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: 'User subscriptions retrieved successfully',
      data: {
        subscriptions
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user subscriptions by email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user subscriptions',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { status = 'all', limit = 10, offset = 0 } = req.query;

    // Build where conditions
    const whereConditions = {
      userEmail,
      activeStatus: true
    };

    // Add status filter
    const now = new Date();
    if (status === 'active') {
      whereConditions.validTo = { [Op.gte]: now };
    } else if (status === 'expired') {
      whereConditions.validTo = { [Op.lt]: now };
    }

    // Get total count
    const totalCount = await UserSubscription.count({
      where: whereConditions
    });

    // Get subscriptions with related data
    const subscriptions = await UserSubscription.findAll({
      where: whereConditions,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Gym,
              as: 'gym',
              attributes: ['id', 'name', 'address', 'city']
            }
          ]
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentAmount', 'status', 'gateway', 'completedAt']
        }
      ],
      order: [['createTimestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'User subscriptions retrieved successfully',
      data: {
        subscriptions,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user subscriptions',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/user-subscriptions/{id}:
 *   get:
 *     tags: [User Subscriptions]
 *     summary: Get a specific user subscription
 *     description: Retrieve details of a specific subscription for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User subscription ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user subscription
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
 *                   $ref: '#/components/schemas/UserSubscription'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userId = req.params.id;

    const subscription = await UserSubscription.findAll({
      where: {
        userId: userId
      },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Gym,
              as: 'gym'
            }
          ]
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'User subscription not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'User subscription retrieved successfully',
      data: subscription,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user subscription',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
