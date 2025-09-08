const paymentService = require('../services/paymentService');
const ResponseUtil = require('../utils/response');
const { Subscription, SubscriptionFeature, Gym } = require('../models');

/**
 * Initiate payment with automatic gateway selection
 */
async function initiatePayment(req, res) {
  try {
    let { gymId, subscriptionId, isBuffer } = req.body;
    const userId = req.user.id; // Updated to use user ID
    const userEmail = req.user.email; // Keep for backward compatibility

    // Validation
    if (!gymId || !subscriptionId) {
      return ResponseUtil.error(res, 'Missing required fields: gymId, subscriptionId, amount', 400);
    }

    let subscriptionModel = await Subscription.findByPk(subscriptionId);
    if (!subscriptionModel && subscriptionModel.gymId !== parseInt(gymId)) {
      return ResponseUtil.error(res, 'Subscription not found', 404);
    }

    let amount = parseFloat(subscriptionModel.price);

    if (amount <= 0) {
      return ResponseUtil.error(res, 'Amount must be greater than 0', 400);
    }

    // Calculate total amount including 18% GST
    let baseAmount = parseFloat(amount);
    if (subscriptionModel.discountPercent) {
      baseAmount = baseAmount - (baseAmount * (parseFloat(subscriptionModel.discountPercent) / 100));
    }

    if (isBuffer && subscriptionModel.bufferFee) {
      baseAmount += parseFloat(subscriptionModel.bufferFee);
    }

    let gstAmount = baseAmount * 0.18; // Round to 2 decimal places
    let totalAmountWithGST = baseAmount + gstAmount;
    totalAmountWithGST = parseFloat(totalAmountWithGST.toFixed(2));
    
    console.log(`💰 Payment calculation: Base: ₹${baseAmount}, GST (18%): ₹${gstAmount}, Total: ₹${totalAmountWithGST}`);

    // Initiate payment with GST included
    const paymentData = await paymentService.initiatePayment({
      gymId,
      subscriptionId,
      baseAmount,
      gstAmount,
      totalAmount: totalAmountWithGST,
      userEmail,
      userId,
      isBuffer: isBuffer
    });

    return ResponseUtil.success(res, paymentData, 'Payment initiated successfully with 18% GST included');

  } catch (error) {
    console.error('Payment initiation error:', error);
    return ResponseUtil.error(res, error.message || 'Failed to initiate payment', 500);
  }
}

/**
 * Get payment configuration for a gym
 */
async function getPaymentConfig(req, res) {
  try {
    const { gymId } = req.params;

    if (!gymId) {
      return ResponseUtil.error(res, 'Gym ID is required', 400);
    }

    const { gateway, config } = await paymentService.determinePaymentGateway(gymId);

    const response = {
      gymId: parseInt(gymId),
      gateway,
      hasVendorConfig: !!config,
      isRazorpayActive: config?.isRazorpayActive || false
    };

    return ResponseUtil.success(res, response, 'Payment configuration retrieved successfully');

  } catch (error) {
    console.error('Get payment config error:', error);
    return ResponseUtil.error(res, error.message || 'Failed to get payment configuration', 500);
  }
}

/**
 * Handle Razorpay payment callback/webhook
 */
async function handleRazorpayCallback(req, res) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Validation
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return ResponseUtil.error(res, 'Missing required Razorpay callback data', 400);
    }

    const result = await paymentService.handleRazorpayCallback({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    });

    if (result.success) {
      return ResponseUtil.success(res, {
        paymentId: result.payment.id,
        status: result.payment.status,
        orderId: razorpay_order_id
      }, 'Razorpay callback processed successfully');
    } else {
      return ResponseUtil.error(res, 'Failed to process Razorpay callback', 400);
    }

  } catch (error) {
    console.error('Razorpay callback error:', error);
    return ResponseUtil.error(res, error.message || 'Failed to process Razorpay callback', 500);
  }
}

/**
 * Handle PhonePe payment callback/webhook
 */
async function handlePhonepeCallback(req, res) {
  try {
    const xVerifyHeader = req.headers['x-verify'];
    const webhookData = req.body;

    if (!xVerifyHeader) {
      return ResponseUtil.error(res, 'Missing X-VERIFY header', 400);
    }

    const result = await paymentService.handlePhonepeCallback(webhookData, xVerifyHeader);

    if (result.success) {
      return ResponseUtil.success(res, {
        paymentId: result.payment.id,
        status: result.status,
        merchantTransactionId: result.payment.phonepeTransactionId
      }, 'PhonePe callback processed successfully');
    } else {
      return ResponseUtil.error(res, 'Failed to process PhonePe callback', 400);
    }

  } catch (error) {
    console.error('PhonePe callback error:', error);
    return ResponseUtil.error(res, error.message || 'Failed to process PhonePe callback', 500);
  }
}

/**
 * Verify payment status
 */
async function verifyPaymentStatus(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return ResponseUtil.error(res, 'Payment ID is required', 400);
    }

    // Get payment from database
    const { Payment } = require('../models');
    const payment = await Payment.findByPk(paymentId);

    if (!payment) {
      return ResponseUtil.error(res, 'Payment not found', 404);
    }

    const response = {
      paymentId: payment.id,
      status: payment.status,
      gateway: payment.gateway,
      amount: payment.paymentAmount,
      createdAt: payment.created_at || payment.createdAt, // Support both field names
      completedAt: payment.completedAt
    };

    return ResponseUtil.success(res, response, 'Payment status retrieved successfully');

  } catch (error) {
    console.error('Verify payment status error:', error);
    return ResponseUtil.error(res, error.message || 'Failed to verify payment status', 500);
  }
}

function getStringStatus(code) {
  switch (code) {
    case 0: return 'pending';
    case 1: return 'success';
    case 2: return 'failed';
    default: return 'unknown';
  }
}

/**
 * Get comprehensive payment status with post-payment processing
 * This endpoint handles payment status after redirect from gateway
 */
async function getPaymentStatusWithProcessing(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return ResponseUtil.error(res, 'Payment ID is required', 400);
    }

    // Process payment status and update database records
    const result = await paymentService.processPaymentStatus(paymentId);

    const response = {
      paymentId: result.payment.id,
      status: getStringStatus(result.payment.status),
      gateway: result.payment.gateway,
      amount: result.payment.amount,
      userEmail: result.payment.userEmail,
      userId: result.payment.userId, // Add user ID to response
      subscription: result.subscription,
      gym: result.gym,
      userSubscription: result.userSubscription,
      createdAt: result.payment.created_at || result.payment.createdAt, // Support both field names
      completedAt: result.payment.completedAt,
      message: result.message,
      nextAction: result.nextAction
    };

    return ResponseUtil.success(res, response, 'Payment status processed successfully');

  } catch (error) {
    console.error('Payment status processing error:', error);
    return ResponseUtil.error(res, error.message || 'Failed to process payment status', 500);
  }
}

/**
 * Get payment history for a user
 */
async function getUserPayments(req, res) {
  try {
    const { userEmail, userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Support both user ID and email for backward compatibility
    if (!userEmail && !userId) {
      return ResponseUtil.error(res, 'User email or user ID is required', 400);
    }

    const { Payment, Subscription, Gym } = require('../models');
    const offset = (page - 1) * limit;

    // Build where clause based on available identifier
    const whereClause = {};
    if (userId) {
      whereClause.userId = userId; // Use user ID if available
    } else {
      whereClause.userEmail = userEmail; // Fall back to email
    }

    const payments = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Gym,
              as: 'gym',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']], // Updated field name
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const response = {
      payments: payments.rows.map(payment => ({
        id: payment.id,
        amount: payment.paymentAmount,
        status: payment.status,
        gateway: payment.gateway,
        gym: payment.subscription?.gym || null,
        createdAt: payment.created_at || payment.createdAt, // Support both field names
        completedAt: payment.completedAt
      })),
      pagination: {
        total: payments.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(payments.count / limit)
      }
    };

    return ResponseUtil.success(res, response, 'User payments retrieved successfully');

  } catch (error) {
    console.error('Get user payments error:', error);
    return ResponseUtil.error(res, error.message || 'Failed to get user payments', 500);
  }
}

module.exports = {
  initiatePayment,
  getPaymentConfig,
  handleRazorpayCallback,
  handlePhonepeCallback,
  verifyPaymentStatus,
  getPaymentStatusWithProcessing,
  getUserPayments
};
