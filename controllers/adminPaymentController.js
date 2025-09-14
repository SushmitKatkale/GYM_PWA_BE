const paymentService = require('../services/paymentService');
const { User, Gym, Subscription, Payment, UserSubscription, Refund } = require('../models');
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
        role: 2, // Updated to use role field
        record_status: 1, // Updated field name
        [Op.or]: [
          { email: { [Op.like]: `%${q}%` } },
          { firstName: { [Op.like]: `%${q}%` } },
          { lastName: { [Op.like]: `%${q}%` } }
        ]
      },
      limit: 10,
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
        record_status: 1, // Updated field name
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { address: { [Op.like]: `%${q}%` } },
          { city: { [Op.like]: `%${q}%` } }
        ]
      },
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'email'] // Include ID for new schema
      }],
      limit: 10,
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
        record_status: 1, // Updated field name
        title: { [Op.like]: `%${q}%` }
      },
      include: [{
        model: Gym,
        as: 'gym',
              }],
      limit: 10,
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
      whereConditions.created_at = {}; // Updated field name
      if (dateFrom) whereConditions.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) whereConditions.created_at[Op.lte] = new Date(dateTo + 'T23:59:59.999Z');
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
              }
    ];

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']], // Updated field name
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
                      }],
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
        created_at: { // Updated field name
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
    const whereConditions = { record_status: 1 }; // Updated field name
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
              },
      {
        model: Payment,
        as: 'payment',
              }
    ];

    const { count, rows: subscriptions } = await UserSubscription.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']], // Updated field name
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
        createdAt: sub.created_at || sub.createdAt, // Support both field names
        updatedAt: sub.updated_at || sub.updatedAt
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
                      }],
                  },
        {
          model: Payment,
          as: 'payment',
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
      where: { record_status: 1 }, // Updated field name
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
        record_status: 1, // Updated field name
        created_at: { // Updated field name
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

/**
 * Check if payment is refundable
 */
async function checkPaymentRefundable(req, res) {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Refund,
          as: 'refunds',
          where: { status: { [Op.in]: ['completed', 'processing'] } },
          required: false
        }
      ]
    });

    if (!payment) {
      return ResponseUtil.notFoundError(res, 'Payment not found');
    }

    // Check if payment is completed
    if (payment.status !== 'completed') {
      return ResponseUtil.success(res, {
        isRefundable: false,
        reason: 'Payment is not completed yet',
        maxRefundAmount: payment.paymentAmount,
        alreadyRefunded: 0
      }, 'Payment refund check completed');
    }

    // Calculate already refunded amount
    const alreadyRefunded = payment.refunds
      ? payment.refunds.reduce((total, refund) => total + parseFloat(refund.refundAmount), 0)
      : 0;

    const maxRefundAmount = parseFloat(payment.paymentAmount);
    const remainingRefundAmount = maxRefundAmount - alreadyRefunded;

    // Check if fully refunded
    if (remainingRefundAmount <= 0) {
      return ResponseUtil.success(res, {
        isRefundable: false,
        reason: 'Payment has already been fully refunded',
        maxRefundAmount,
        alreadyRefunded
      }, 'Payment refund check completed');
    }

    // Check if payment is too old (6 months)
    const paymentDate = new Date(payment.created_at || payment.createdAt); // Support both field names
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (paymentDate < sixMonthsAgo) {
      return ResponseUtil.success(res, {
        isRefundable: false,
        reason: 'Payment is older than 6 months and cannot be refunded',
        maxRefundAmount,
        alreadyRefunded
      }, 'Payment refund check completed');
    }

    // Payment is refundable
    return ResponseUtil.success(res, {
      isRefundable: true,
      maxRefundAmount,
      alreadyRefunded,
      remainingRefundAmount
    }, 'Payment is eligible for refund');

  } catch (error) {
    console.error('Error checking payment refund eligibility:', error);
    return ResponseUtil.error(res, 'Failed to check refund eligibility', 500);
  }
}

/**
 * Get all refunds with filtering and pagination
 */
async function getAllRefunds(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      userEmail,
      refundType,
      dateFrom,
      dateTo
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where conditions
    const whereConditions = { record_status: 1 }; // Updated field name
    if (status) whereConditions.status = status;
    if (userEmail) whereConditions.userEmail = { [Op.like]: `%${userEmail}%` };
    if (refundType) whereConditions.refundType = refundType;
    
    // Date range filtering
    if (dateFrom || dateTo) {
      whereConditions.created_at = {}; // Updated field name
      if (dateFrom) whereConditions.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) whereConditions.created_at[Op.lte] = new Date(dateTo + 'T23:59:59.999Z');
    }

    const { count, rows: refunds } = await Refund.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Payment,
          as: 'payment',
                  },
        {
          model: UserSubscription,
          as: 'subscription',
          include: [{
            model: Subscription,
            as: 'subscription',
            include: [{
              model: Gym,
              as: 'gym',
                          }],
                      }],
                  },
        {
          model: User,
          as: 'user',
                  }
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']], // Updated field name
      distinct: true
    });

    // Process refunds to format data
    const processedRefunds = refunds.map(refund => {
      const ref = refund.toJSON();
      return {
        ...ref,
        createdAt: ref.created_at || ref.createdAt, // Support both field names
        updatedAt: ref.updated_at || ref.updatedAt
      };
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return ResponseUtil.success(res, {
      refunds: processedRefunds,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    }, 'Refunds retrieved successfully');
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return ResponseUtil.error(res, 'Failed to fetch refunds', 500);
  }
}

/**
 * Get refund details by ID
 */
async function getRefundById(req, res) {
  try {
    const { id } = req.params;
    
    const refund = await Refund.findByPk(id, {
      include: [
        {
          model: Payment,
          as: 'payment',
          include: [{
            model: Subscription,
            as: 'subscription',
            include: [{
              model: Gym,
              as: 'gym',
                          }],
                      }],
                  },
        {
          model: UserSubscription,
          as: 'subscription',
          include: [{
            model: Subscription,
            as: 'subscription',
            include: [{
              model: Gym,
              as: 'gym',
                          }],
                      }]
        },
        {
          model: User,
          as: 'user',
                  }
      ]
    });

    if (!refund) {
      return ResponseUtil.notFoundError(res, 'Refund not found');
    }

    return ResponseUtil.success(res, refund, 'Refund details retrieved successfully');
  } catch (error) {
    console.error('Error fetching refund details:', error);
    return ResponseUtil.error(res, 'Failed to fetch refund details', 500);
  }
}

/**
 * Create a new refund
 */
async function createRefund(req, res) {
  try {
    const {
      paymentId,
      subscriptionId,
      refundAmount,
      refundReason,
      refundType
    } = req.body;

    // Validate required fields
    if (!paymentId || !refundAmount || !refundReason || !refundType) {
      return ResponseUtil.error(res, 'Payment ID, refund amount, reason, and type are required', 400);
    }

    // Get payment details
    const payment = await Payment.findByPk(paymentId, {
      include: [{
        model: Refund,
        as: 'refunds',
        where: { status: { [Op.in]: ['completed', 'processing'] } },
        required: false
      }]
    });

    if (!payment) {
      return ResponseUtil.notFoundError(res, 'Payment not found');
    }

    if (payment.status !== 'completed') {
      return ResponseUtil.error(res, 'Cannot refund incomplete payment', 400);
    }

    // Calculate already refunded amount
    const alreadyRefunded = payment.refunds
      ? payment.refunds.reduce((total, refund) => total + parseFloat(refund.refundAmount), 0)
      : 0;

    const maxRefundAmount = parseFloat(payment.paymentAmount);
    const requestedRefundAmount = parseFloat(refundAmount);
    const totalAfterRefund = alreadyRefunded + requestedRefundAmount;

    // Validate refund amount
    if (requestedRefundAmount <= 0) {
      return ResponseUtil.error(res, 'Refund amount must be greater than 0', 400);
    }

    if (totalAfterRefund > maxRefundAmount) {
      return ResponseUtil.error(res, `Refund amount exceeds available balance. Available: ₹${(maxRefundAmount - alreadyRefunded).toFixed(2)}`, 400);
    }

    // Create refund record
    const refund = await Refund.create({
      paymentId,
      userEmail: payment.userEmail,
      subscriptionId: subscriptionId || null,
      originalAmount: payment.paymentAmount,
      refundAmount: requestedRefundAmount,
      refundReason,
      refundType,
      paymentGateway: payment.gateway,
      status: 'pending',
      createdBy: req.user?.email || 'system'
    });

    // If this is a subscription refund, deactivate the subscription
    if (subscriptionId) {
      await UserSubscription.update(
        { record_status: 0, updatedBy: req.user?.email || 'system' }, // Updated field name
        { where: { id: subscriptionId } }
      );
    }

    return ResponseUtil.success(res, refund, 'Refund created successfully', 201);
  } catch (error) {
    console.error('Error creating refund:', error);
    return ResponseUtil.error(res, 'Failed to create refund', 500);
  }
}

/**
 * Update refund status
 */
async function updateRefundStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return ResponseUtil.error(res, 'Status is required', 400);
    }

    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return ResponseUtil.error(res, 'Invalid status', 400);
    }

    const refund = await Refund.findByPk(id);
    if (!refund) {
      return ResponseUtil.notFoundError(res, 'Refund not found');
    }

    const updateData = {
      status,
      updatedBy: req.user?.email || 'system'
    };

    if (notes) updateData.notes = notes;
    if (status === 'completed' || status === 'processing') {
      updateData.processedBy = req.user?.email || 'system';
      updateData.processedAt = new Date();
    }

    await refund.update(updateData);

    // Send refund completed email notification if status is completed
    if (status === 'completed') {
      try {
        const mailService = require('../services/mailService');
        
        // Get full refund details with payment and subscription info
        const refundDetails = await Refund.findByPk(id, {
          include: [
            {
              model: Payment,
              as: 'payment',
              include: [{
                model: Subscription,
                as: 'subscription',
                include: [{
                  model: Gym,
                  as: 'gym',
                                  }],
                              }],
                          }
          ]
        });
        
        const { User } = require('../models');
        const user = await User.findOne({ where: { email: refundDetails.userEmail } });
        const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Valued Customer';

        await mailService.sendRefundCompleted({
          userEmail: refundDetails.userEmail,
          userName,
          refundAmount: refundDetails.refundAmount,
          refundReason: refundDetails.refundReason,
          gatewayRefundId: refundDetails.gatewayRefundId,
          gymName: refundDetails.payment?.subscription?.gym?.name || 'Gym',
          subscriptionTitle: refundDetails.payment?.subscription?.title || 'Gym Subscription',
          gateway: refundDetails.paymentGateway,
          completedAt: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        });

        console.log(`Refund completed email sent to ${refundDetails.userEmail}`);
      } catch (emailError) {
        console.error('Error sending refund completed email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    return ResponseUtil.success(res, refund, 'Refund status updated successfully');
  } catch (error) {
    console.error('Error updating refund status:', error);
    return ResponseUtil.error(res, 'Failed to update refund status', 500);
  }
}

/**
 * Get refund statistics
 */
async function getRefundStats(req, res) {
  try {
    const stats = await Refund.findAll({
      where: { record_status: 1 }, // Updated field name
      attributes: [
        [fn('COUNT', col('id')), 'totalRefunds'],
        [fn('SUM', col('refundAmount')), 'totalRefundAmount'],
        [fn('COUNT', literal('CASE WHEN status = "pending" THEN 1 END')), 'pendingRefunds'],
        [fn('COUNT', literal('CASE WHEN status = "completed" THEN 1 END')), 'completedRefunds'],
        [fn('COUNT', literal('CASE WHEN status = "failed" THEN 1 END')), 'failedRefunds']
      ],
      raw: true
    });

    const todaysStats = await Refund.findAll({
      where: {
        record_status: 1, // Updated field name
        created_at: { // Updated field name
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      attributes: [
        [fn('COUNT', col('id')), 'todayRefunds'],
        [fn('SUM', col('refundAmount')), 'todayRefundAmount']
      ],
      raw: true
    });

    const result = {
      ...stats[0],
      ...todaysStats[0],
      totalRefundAmount: parseFloat(stats[0].totalRefundAmount || 0),
      todayRefundAmount: parseFloat(todaysStats[0].todayRefundAmount || 0)
    };

    return ResponseUtil.success(res, result, 'Refund statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching refund stats:', error);
    return ResponseUtil.error(res, 'Failed to fetch refund statistics', 500);
  }
}

/**
 * Initiate refund with payment gateway first, then create refund record
 * This is the new gateway-first refund flow
 */
async function initiateRefundWithGateway(req, res) {
  try {
    const {
      paymentId,
      subscriptionId,
      refundAmount,
      refundReason,
      refundType
    } = req.body;

    // Validate required fields
    if (!paymentId || !refundAmount || !refundReason || !refundType) {
      return ResponseUtil.error(res, 'Payment ID, refund amount, reason, and type are required', 400);
    }

    // Get payment details with existing refunds
    const payment = await Payment.findByPk(paymentId, {
      include: [{
        model: Refund,
        as: 'refunds',
        where: { status: { [Op.in]: ['completed', 'processing'] } },
        required: false
      }]
    });

    if (!payment) {
      return ResponseUtil.notFoundError(res, 'Payment not found');
    }

    if (payment.status !== 'completed') {
      return ResponseUtil.error(res, 'Cannot refund incomplete payment', 400);
    }

    // Calculate already refunded amount
    const alreadyRefunded = payment.refunds
      ? payment.refunds.reduce((total, refund) => total + parseFloat(refund.refundAmount), 0)
      : 0;

    const maxRefundAmount = parseFloat(payment.paymentAmount);
    const requestedRefundAmount = parseFloat(refundAmount);
    const totalAfterRefund = alreadyRefunded + requestedRefundAmount;

    // Validate refund amount
    if (requestedRefundAmount <= 0) {
      return ResponseUtil.error(res, 'Refund amount must be greater than 0', 400);
    }

    if (totalAfterRefund > maxRefundAmount) {
      return ResponseUtil.error(res, `Refund amount exceeds available balance. Available: ₹${(maxRefundAmount - alreadyRefunded).toFixed(2)}`, 400);
    }

    // Step 1: Initiate refund with payment gateway first
    console.log('Initiating refund with gateway:', {
      paymentId,
      gateway: payment.gateway,
      amount: requestedRefundAmount
    });

    let gatewayRefundResult;
    const razorpayService = require('../services/razorpayVendorService');
    const phonepeService = require('../services/phonepeService');

    if (payment.gateway === 'razorpay') {
      // Use Razorpay payment ID for refund
      if (!payment.razorpayPaymentId) {
        return ResponseUtil.error(res, 'Razorpay payment ID not found for this payment', 400);
      }

      gatewayRefundResult = await razorpayService.initiateRefund({
        razorpayPaymentId: payment.razorpayPaymentId,
        refundAmount: requestedRefundAmount,
        refundReason,
        refundId: null // Will be set after DB creation
      });
    } else if (payment.gateway === 'phonepe') {
      // Use PhonePe transaction ID for refund
      if (!payment.phonepeTransactionId) {
        return ResponseUtil.error(res, 'PhonePe transaction ID not found for this payment', 400);
      }

      gatewayRefundResult = await phonepeService.initiateRefund({
        phonepeTransactionId: payment.phonepeTransactionId,
        refundAmount: requestedRefundAmount,
        refundReason,
        refundId: null // Will be set after DB creation
      });
    } else {
      return ResponseUtil.error(res, `Unsupported payment gateway: ${payment.gateway}`, 400);
    }

    // Step 2: Only create refund record if gateway call succeeded
    if (!gatewayRefundResult.success) {
      return ResponseUtil.error(res, `Gateway refund failed: ${gatewayRefundResult.message || 'Unknown error'}`, 400);
    }

    console.log('Gateway refund initiated successfully:', gatewayRefundResult);

    // Step 3: Create refund record in database
    const refund = await Refund.create({
      paymentId,
      userEmail: payment.userEmail,
      subscriptionId: subscriptionId || null,
      originalAmount: payment.paymentAmount,
      refundAmount: requestedRefundAmount,
      refundReason,
      refundType,
      paymentGateway: payment.gateway,
      status: gatewayRefundResult.status || 'processing',
      gatewayRefundId: gatewayRefundResult.gatewayRefundId,
      gatewayResponse: gatewayRefundResult.gatewayResponse,
      processedBy: req.user?.email || 'system',
      processedAt: new Date(),
      createdBy: req.user?.email || 'system'
    });

    // Step 4: If this is a subscription refund, deactivate the subscription
    if (subscriptionId) {
      const { UserSubscription } = require('../models');
      await UserSubscription.update(
        { record_status: 0, updatedBy: req.user?.email || 'system' }, // Updated field name
        { where: { id: subscriptionId } }
      );
    }

    console.log('Refund record created successfully:', {
      refundId: refund.id,
      gatewayRefundId: refund.gatewayRefundId,
      status: refund.status
    });

    // Send refund initiated email notification
    try {
      const mailService = require('../services/mailService');
      
      // Get user details and related data for email
      const paymentWithDetails = await Payment.findByPk(paymentId, {
        include: [
          {
            model: Subscription,
            as: 'subscription',
            include: [{
              model: Gym,
              as: 'gym',
                          }],
                      }
        ]
      });
      
      const { User } = require('../models');
      const user = await User.findOne({ where: { email: payment.userEmail } });
      const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Valued Customer';

      await mailService.sendRefundInitiated({
        userEmail: payment.userEmail,
        userName,
        refundAmount: refund.refundAmount,
        refundReason: refund.refundReason,
        gatewayRefundId: refund.gatewayRefundId,
        gymName: paymentWithDetails?.subscription?.gym?.name || 'Gym',
        subscriptionTitle: paymentWithDetails?.subscription?.title || 'Gym Subscription',
        gateway: payment.gateway,
        estimatedDays: payment.gateway === 'razorpay' ? '3-5 business days' : '5-7 business days'
      });

      console.log(`Refund initiated email sent to ${payment.userEmail}`);
    } catch (emailError) {
      console.error('Error sending refund initiated email:', emailError);
      // Don't fail the refund process if email fails
    }

    return ResponseUtil.success(res, {
      refund,
      gatewayResult: {
        success: gatewayRefundResult.success,
        gatewayRefundId: gatewayRefundResult.gatewayRefundId,
        status: gatewayRefundResult.status,
        message: gatewayRefundResult.message
      }
    }, 'Refund initiated successfully with payment gateway', 201);

  } catch (error) {
    console.error('Error initiating refund with gateway:', error);
    return ResponseUtil.error(res, `Failed to initiate refund: ${error.message}`, 500);
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
  getUserSubscriptionStats,
  // Refund Management
  checkPaymentRefundable,
  getRefunds: getAllRefunds,
  getAllRefunds,
  getRefundById,
  createRefund,
  initiateRefundWithGateway, // New gateway-first refund function
  updateRefundStatus,
  getRefundStats
};
