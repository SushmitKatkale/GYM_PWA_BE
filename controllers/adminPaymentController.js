const paymentService = require('../services/paymentService');
const { User, Gym, Subscription, Payment, UserSubscription } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const ResponseUtil = require('../utils/response');

/**
 * Create a Razorpay order and generate an invoice
 */
async function createPaymentAndInvoice(req, res) {
  try {
    const { subscriptionId, totalAmount } = req.body;
    if (!subscriptionId || !totalAmount) {
      return res.status(400).json({ error: 'Subscription ID and total amount are required.' });
    }

    const order = await paymentService.createOrderWithRazorpay(subscriptionId, totalAmount);

    return res.status(201).json({ success: true, order, message: 'Payment and invoice created successfully.' });
  } catch (error) {
    console.error('Error creating payment and invoice:', error);
    return res.status(500).json({ error: 'Failed to create payment and invoice.' });
  }
}

/**
 * Search gym owners for autocomplete
 */
async function searchOwners(req, res) {
  try {
    const { q } = req.query;

    if (!q || q.length < 1) {
      return ResponseUtil.success(res, [], 'Search query too short');
    }

    const owners = await User.findAll({
      where: {
        type: '2', // Owner type
        activeStatus: '1',
        [Op.or]: [
          { email: { [Op.like]: `%${q}%` } },
          { firstName: { [Op.like]: `%${q}%` } },
          { lastName: { [Op.like]: `%${q}%` } }
        ]
      },
      limit: 10,
      attributes: ['id', 'email', 'firstName', 'lastName']
    });

    const formattedOwners = owners.map(owner => ({
      id: owner.id,
      email: owner.email,
      name: `${owner.firstName} ${owner.lastName}`.trim()
    }));

    return ResponseUtil.success(res, formattedOwners, 'Owners found successfully');
  } catch (error) {
    console.error('Error searching owners:', error);
    return ResponseUtil.error(res, 'Failed to search owners', 500);
  }
}

/**
 * Search gyms for autocomplete
 */
async function searchGyms(req, res) {
  try {
    const { q } = req.query;

    if (!q || q.length < 1) {
      return ResponseUtil.success(res, [], 'Search query too short');
    }

    const gyms = await Gym.findAll({
      where: {
        activeStatus: true,
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { address: { [Op.like]: `%${q}%` } },
          { city: { [Op.like]: `%${q}%` } }
        ]
      },
      include: [{
        model: User,
        as: 'owner',
        attributes: ['email']
      }],
      limit: 10,
      attributes: ['id', 'name', 'address', 'city']
    });

    const formattedGyms = gyms.map(gym => ({
      id: gym.id,
      name: gym.name,
      address: `${gym.address}, ${gym.city}`,
      ownerEmail: gym.owner ? gym.owner.email : 'N/A'
    }));

    return ResponseUtil.success(res, formattedGyms, 'Gyms found successfully');
  } catch (error) {
    console.error('Error searching gyms:', error);
    return ResponseUtil.error(res, 'Failed to search gyms', 500);
  }
}

/**
 * Search subscriptions for autocomplete
 */
async function searchSubscriptions(req, res) {
  try {
    const { q } = req.query;

    if (!q || q.length < 1) {
      return ResponseUtil.success(res, [], 'Search query too short');
    }

    const subscriptions = await Subscription.findAll({
      where: {
        activeStatus: true,
        title: { [Op.like]: `%${q}%` }
      },
      include: [{
        model: Gym,
        as: 'gym',
        attributes: ['name']
      }],
      limit: 10,
      attributes: ['id', 'title', 'price', 'discountedPrice']
    });

    const formattedSubscriptions = subscriptions.map(subscription => ({
      id: subscription.id,
      title: subscription.title,
      price: subscription.discountedPrice || subscription.price,
      gymName: subscription.gym ? subscription.gym.name : 'N/A',
      gymId: subscription.gymId
    }));

    return ResponseUtil.success(res, formattedSubscriptions, 'Subscriptions found successfully');
  } catch (error) {
    console.error('Error searching subscriptions:', error);
    return ResponseUtil.error(res, 'Failed to search subscriptions', 500);
  }
}

/**
 * Get all payments with filtering and pagination
 */
async function getAllPayments(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      gateway,
      userEmail,
      gymName,
      dateFrom,
      dateTo
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where conditions
    const whereConditions = {};
    if (status) whereConditions.status = status;
    if (gateway) whereConditions.gateway = gateway;
    if (userEmail) whereConditions.userEmail = { [Op.like]: `%${userEmail}%` };
    
    // Date range filtering
    if (dateFrom || dateTo) {
      whereConditions.createTimestamp = {};
      if (dateFrom) whereConditions.createTimestamp[Op.gte] = new Date(dateFrom);
      if (dateTo) whereConditions.createTimestamp[Op.lte] = new Date(dateTo + 'T23:59:59.999Z');
    }

    // Include conditions for gym filtering
    const includeConditions = [
      {
        model: Subscription,
        as: 'subscription',
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address', 'city'],
          where: gymName ? { name: { [Op.like]: `%${gymName}%` } } : undefined
        }],
        attributes: ['id', 'title', 'price', 'validityDays']
      }
    ];

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit: parseInt(limit),
      offset,
      order: [['createTimestamp', 'DESC']],
      distinct: true
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return ResponseUtil.success(res, {
      payments,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    }, 'Payments retrieved successfully');
  } catch (error) {
    console.error('Error fetching payments:', error);
    return ResponseUtil.error(res, 'Failed to fetch payments', 500);
  }
}

/**
 * Get payment details by ID
 */
async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [{
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name', 'address', 'city', 'phoneNumber']
          }],
          attributes: ['id', 'title', 'price', 'validityDays']
        }
      ]
    });

    if (!payment) {
      return ResponseUtil.notFoundError(res, 'Payment not found');
    }

    return ResponseUtil.success(res, payment, 'Payment details retrieved successfully');
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return ResponseUtil.error(res, 'Failed to fetch payment details', 500);
  }
}

/**
 * Get payment statistics
 */
async function getPaymentStats(req, res) {
  try {
    const stats = await Payment.findAll({
      attributes: [
        [fn('COUNT', col('id')), 'totalPayments'],
        [fn('COUNT', col('id')), 'totalPayments'],
        [fn('SUM', col('paymentAmount')), 'totalRevenue'],
        [fn('COUNT', literal('CASE WHEN status = "completed" THEN 1 END')), 'completedPayments'],
        [fn('COUNT', literal('CASE WHEN status = "pending" THEN 1 END')), 'pendingPayments'],
        [fn('COUNT', literal('CASE WHEN status = "failed" THEN 1 END')), 'failedPayments'],
        [fn('COUNT', literal('CASE WHEN gateway = "razorpay" THEN 1 END')), 'razorpayPayments'],
        [fn('COUNT', literal('CASE WHEN gateway = "phonepe" THEN 1 END')), 'phonePePayments']
      ],
      raw: true
    });

    const todaysStats = await Payment.findAll({
      where: {
        createTimestamp: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      attributes: [
        [fn('COUNT', col('id')), 'todayPayments'],
        [fn('SUM', col('paymentAmount')), 'todayRevenue']
      ],
      raw: true
    });

    const result = {
      ...stats[0],
      ...todaysStats[0],
      totalRevenue: parseFloat(stats[0].totalRevenue || 0),
      todayRevenue: parseFloat(todaysStats[0].todayRevenue || 0)
    };

    return ResponseUtil.success(res, result, 'Payment statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return ResponseUtil.error(res, 'Failed to fetch payment statistics', 500);
  }
}

/**
 * Get all user subscriptions with filtering and pagination
 */
async function getAllUserSubscriptions(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      userEmail,
      gymName
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where conditions
    const whereConditions = { activeStatus: true };
    if (userEmail) whereConditions.userEmail = { [Op.like]: `%${userEmail}%` };
    
    // Status filtering (active, expired, expiring)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (status === 'active') {
      whereConditions.validTo = { [Op.gt]: now };
    } else if (status === 'expired') {
      whereConditions.validTo = { [Op.lt]: now };
    } else if (status === 'expiring') {
      whereConditions.validTo = { [Op.between]: [now, sevenDaysFromNow] };
    }

    // Include conditions for gym filtering
    const includeConditions = [
      {
        model: Subscription,
        as: 'subscription',
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address', 'city'],
          where: gymName ? { name: { [Op.like]: `%${gymName}%` } } : undefined
        }],
        attributes: ['id', 'title', 'price', 'validityDays']
      },
      {
        model: Payment,
        as: 'payment',
        attributes: ['id', 'paymentAmount', 'status', 'gateway', 'completedAt', 'transactionId']
      }
    ];

    const { count, rows: subscriptions } = await UserSubscription.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit: parseInt(limit),
      offset,
      order: [['createTimestamp', 'DESC']],
      distinct: true
    });

    // Process subscriptions to add calculated status and format data
    const processedSubscriptions = subscriptions.map(subscription => {
      const sub = subscription.toJSON();
      const now = new Date();
      const validTo = new Date(sub.validTo);
      
      // Calculate dynamic status
      let calculatedStatus = 'expired';
      if (validTo > now) {
        calculatedStatus = 'active';
      }
      
      // Add calculated fields to match frontend interface
      return {
        ...sub,
        status: calculatedStatus,
        endDate: sub.validTo,
        startDate: sub.validFrom,
        price: sub.subscription?.price || 0,
        paidAmount: sub.payment?.paymentAmount || 0,
        paymentStatus: sub.payment?.status || 'unknown',
        paymentGateway: sub.payment?.gateway || 'unknown',
        transactionId: sub.payment?.transactionId || null,
        gym: sub.subscription?.gym || null,
        createdAt: sub.createTimestamp,
        updatedAt: sub.updateTimestamp
      };
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return ResponseUtil.success(res, {
      subscriptions: processedSubscriptions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    }, 'User subscriptions retrieved successfully');
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return ResponseUtil.error(res, 'Failed to fetch user subscriptions', 500);
  }
}

/**
 * Get user subscription details by ID
 */
async function getUserSubscriptionById(req, res) {
  try {
    const { id } = req.params;
    
    const subscription = await UserSubscription.findByPk(id, {
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [{
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name', 'address', 'city', 'phoneNumber']
          }],
          attributes: ['id', 'title', 'price', 'validityDays']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentAmount', 'status', 'gateway', 'completedAt', 'transactionId']
        }
      ]
    });

    if (!subscription) {
      return ResponseUtil.notFoundError(res, 'User subscription not found');
    }

    return ResponseUtil.success(res, subscription, 'User subscription details retrieved successfully');
  } catch (error) {
    console.error('Error fetching user subscription details:', error);
    return ResponseUtil.error(res, 'Failed to fetch user subscription details', 500);
  }
}

/**
 * Get user subscription statistics
 */
async function getUserSubscriptionStats(req, res) {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const stats = await UserSubscription.findAll({
      where: { activeStatus: true },
      attributes: [
        [fn('COUNT', col('id')), 'totalSubscriptions'],
        [fn('COUNT', literal('CASE WHEN validTo > NOW() THEN 1 END')), 'activeSubscriptions'],
        [fn('COUNT', literal('CASE WHEN validTo < NOW() THEN 1 END')), 'expiredSubscriptions'],
        [fn('COUNT', literal(`CASE WHEN validTo BETWEEN NOW() AND '${sevenDaysFromNow.toISOString()}' THEN 1 END`)), 'expiringSubscriptions']
      ],
      raw: true
    });

    const todaysStats = await UserSubscription.findAll({
      where: {
        activeStatus: true,
        createTimestamp: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      attributes: [
        [fn('COUNT', col('id')), 'todaySubscriptions']
      ],
      raw: true
    });

    const result = {
      ...stats[0],
      ...todaysStats[0]
    };

    return ResponseUtil.success(res, result, 'User subscription statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching user subscription stats:', error);
    return ResponseUtil.error(res, 'Failed to fetch user subscription statistics', 500);
  }
}

module.exports = {
  createPaymentAndInvoice,
  searchOwners,
  searchGyms,
  searchSubscriptions,
  // Payment Management
  getAllPayments,
  getPaymentById,
  getPaymentStats,
  // User Subscription Management
  getAllUserSubscriptions,
  getUserSubscriptionById,
  getUserSubscriptionStats
};
