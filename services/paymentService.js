const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Payment, Invoice, VendorPaymentConfig, Subscription, Gym, User } = require('../models');
const { generateInvoicePDF } = require('../utils/invoiceUtils');
const phonepeService = require('./phonepeService');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Calculate commission and GST
 */
function calculateCommissionWithGST(orderAmount, cutType, cutValue) {
  let commission = 0;
  if (cutType === 'percentage') {
    commission = (orderAmount * cutValue) / 100;
  } else if (cutType === 'flat') {
    commission = cutValue;
  }
  const gstOnCommission = (commission * 18) / 100;
  const totalDeduction = commission + gstOnCommission;
  const vendorAmount = orderAmount - totalDeduction;

  return {
    commission,
    gstOnCommission,
    totalDeduction,
    vendorAmount,
  };
}

/**
 * Create Order with Razorpay and calculate splits
 */
async function createOrderWithRazorpay(subscriptionId, totalAmount) {
  const subscription = await Subscription.findByPk(subscriptionId, { include: Gym });
  const vendorConfig = await VendorPaymentConfig.findOne({
    where: { gymId: subscription.gymId },
  });

  if (!vendorConfig) throw new Error('Vendor configuration not found.');

  const splits = calculateCommissionWithGST(
    totalAmount,
    vendorConfig.cutType,
    vendorConfig.cutValue
  );

  // Create Razorpay order
  const order = await razorpayInstance.orders.create({
    amount: totalAmount * 100, // in paise
    currency: 'INR',
    transfers: [
      {
        account: process.env.ADMIN_RAZORPAY_ACCOUNT_ID,
        amount: splits.totalDeduction * 100,
        currency: 'INR',
      },
      {
        account: vendorConfig.razorpayVendorId,
        amount: splits.vendorAmount * 100,
        currency: 'INR',
      },
    ],
  });

  // Save order details
  const payment = await Payment.create({
    paymentAmount: totalAmount,
    razorpayOrderId: order.id,
    vendorConfigId: vendorConfig.id,
    commission: splits.commission,
    gstOnCommission: splits.gstOnCommission,
    totalDeduction: splits.totalDeduction,
    vendorAmount: splits.vendorAmount,
  });

  // Generate Invoice PDF
  await generateInvoicePDF(payment);

  return order;
}

/**
 * Determine which payment gateway to use based on vendor configuration
 */
async function determinePaymentGateway(gymId) {
  try {
    const vendorConfig = await VendorPaymentConfig.findOne({
      where: { 
        gymId,
        activeStatus: true 
      }
    });

    // Check if Razorpay is configured and active
    if (vendorConfig && 
        vendorConfig.razorpayVendorId && 
        vendorConfig.isRazorpayActive && 
        vendorConfig.activeStatus) {
      return {
        gateway: 'razorpay',
        config: vendorConfig
      };
    }

    // Default to PhonePe
    return {
      gateway: 'phonepe',
      config: null
    };
  } catch (error) {
    console.error('Error determining payment gateway:', error);
    // Fallback to PhonePe in case of error
    return {
      gateway: 'phonepe',
      config: null
    };
  }
}

/**
 * Create payment order with automatic gateway selection
 */
async function initiatePayment(paymentData) {
  const { gymId, subscriptionId, amount, userEmail } = paymentData;

  try {
    // Get user details
    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) {
      throw new Error('User not found');
    }

    // Get subscription details
    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [{
        model: Gym,
        as: 'gym'
      }]
    });
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Determine payment gateway
    const { gateway, config } = await determinePaymentGateway(gymId);
    
    console.log(`Using payment gateway: ${gateway} for gym ${gymId}`);

    if (gateway === 'razorpay') {
      return await createRazorpayPayment({
        subscription,
        vendorConfig: config,
        amount,
        userEmail
      });
    } else {
      return await createPhonepePayment({
        subscription,
        amount,
        userEmail,
        user
      });
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw error;
  }
}

/**
 * Create Razorpay payment with commission splits
 */
async function createRazorpayPayment({ subscription, vendorConfig, amount, userEmail }) {
  const splits = calculateCommissionWithGST(
    amount,
    vendorConfig.cutType,
    vendorConfig.cutValue
  );

  // Create Razorpay order with transfers
  const order = await razorpayInstance.orders.create({
    amount: amount * 100, // in paise
    currency: 'INR',
    receipt: `sub_${subscription.id}_${Date.now()}`,
    transfers: [
      {
        account: process.env.ADMIN_RAZORPAY_ACCOUNT_ID,
        amount: splits.totalDeduction * 100,
        currency: 'INR',
      },
      {
        account: vendorConfig.razorpayVendorId,
        amount: splits.vendorAmount * 100,
        currency: 'INR',
      },
    ],
  });

  // Save payment record
  const payment = await Payment.create({
    paymentAmount: amount,
    paymentRefNo: order.receipt, // Use Razorpay receipt as payment reference
    razorpayOrderId: order.id,
    vendorConfigId: vendorConfig.id,
    subscriptionId: subscription.id,
    userEmail,
    gateway: 'razorpay',
    status: 'pending',
    commission: splits.commission,
    gstOnCommission: splits.gstOnCommission,
    totalDeduction: splits.totalDeduction,
    vendorAmount: splits.vendorAmount,
  });

  return {
    success: true,
    gateway: 'razorpay',
    orderId: order.id,
    amount: amount,
    currency: 'INR',
    key: process.env.RAZORPAY_KEY_ID,
    paymentId: payment.id,
    splits
  };
}

/**
 * Create PhonePe payment (fallback)
 */
async function createPhonepePayment({ subscription, amount, userEmail, user }) {
  const merchantTransactionId = phonepeService.generateMerchantTransactionId();

  // Save payment record first to get payment ID
  const payment = await Payment.create({
    paymentAmount: amount,
    paymentRefNo: merchantTransactionId,
    phonepeTransactionId: merchantTransactionId,
    subscriptionId: subscription.id,
    userEmail,
    gateway: 'phonepe',
    status: 'pending',
    commission: 0, // No commission for PhonePe fallback
    gstOnCommission: 0,
    totalDeduction: 0,
    vendorAmount: amount, // Full amount goes to one account
  });

  // Create PhonePe order with payment ID for dynamic redirect URL
  const phonepeOrder = await phonepeService.createOrder({
    merchantTransactionId,
    amount,
    userEmail,
    userPhone: user.phoneNumber || '9999999999', // Fallback phone number
    paymentId: payment.id // Pass payment ID for dynamic redirect URL
  });

  return {
    success: true,
    gateway: 'phonepe',
    orderId: merchantTransactionId,
    paymentUrl: phonepeOrder.paymentUrl,
    amount: amount,
    paymentId: payment.id
  };
}

/**
 * Handle Razorpay webhook/callback
 */
async function handleRazorpayCallback(paymentData) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentData;
    
    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Update payment record
    const payment = await Payment.findOne({
      where: { razorpayOrderId: razorpay_order_id }
    });

    if (payment) {
      await payment.update({
        razorpayPaymentId: razorpay_payment_id,
        transactionId: razorpay_payment_id,
        status: 'completed',
        completedAt: new Date(),
        gatewayResponse: JSON.stringify(paymentData)
      });
    }

    return { success: true, payment };
  } catch (error) {
    console.error('Razorpay callback error:', error);
    throw error;
  }
}

/**
 * Handle PhonePe webhook/callback
 */
async function handlePhonepeCallback(webhookData, xVerifyHeader) {
  try {
    const processedWebhook = await phonepeService.processWebhook(webhookData, xVerifyHeader);
    
    if (!processedWebhook.success) {
      throw new Error('Invalid PhonePe webhook');
    }

    const { data } = processedWebhook;
    const paymentStatus = phonepeService.convertPaymentStatus(data.code);
    
    // Update payment record
    const payment = await Payment.findOne({
      where: { phonepeTransactionId: data.merchantTransactionId }
    });

    if (payment) {
      // Prepare update object with all available data from PhonePe webhook response
      const updateData = {
        phonepePaymentId: data.transactionId,
        transactionId: data.transactionId,
        status: paymentStatus,
        completedAt: paymentStatus === 'completed' ? new Date() : null,
        gatewayResponse: JSON.stringify(data)
      };
      
      // Extract additional fields if available
      if (data.bankRefNo || data.referenceId) {
        updateData.bankRefNo = data.bankRefNo || data.referenceId;
      }
      
      // Update payment method if available
      if (data.paymentMethod) {
        const paymentMethod = data.paymentMethod.toLowerCase();
        if (['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet'].includes(paymentMethod)) {
          updateData.paidVia = paymentMethod;
        } else if (paymentMethod.includes('upi')) {
          updateData.paidVia = 'upi';
        } else if (paymentMethod.includes('card')) {
          updateData.paidVia = data.paymentMethod.includes('credit') ? 'credit_card' : 'debit_card';
        } else if (paymentMethod.includes('net') || paymentMethod.includes('bank')) {
          updateData.paidVia = 'net_banking';
        } else if (paymentMethod.includes('wallet')) {
          updateData.paidVia = 'wallet';
        }
      }
      
      console.log('Updating payment with PhonePe webhook data:', {
        paymentId: payment.id,
        status: paymentStatus,
        updateFields: Object.keys(updateData)
      });
      
      await payment.update(updateData);
    }

    return { success: true, payment, status: paymentStatus };
  } catch (error) {
    console.error('PhonePe callback error:', error);
    throw error;
  }
}

/**
 * Process payment status after redirect from gateway and update related records
 */
async function processPaymentStatus(paymentId) {
  try {
    const { UserSubscription } = require('../models');
    
    // Get payment with related data including subscription and gym information
    const payment = await Payment.findByPk(paymentId, {
      include: [{
        model: Subscription,
        as: 'subscription',
        include: [{
          model: Gym,
          as: 'gym'
        }]
      }]
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    let paymentStatus = payment.status;
    let message = '';
    let nextAction = '';
    let userSubscription = null;

    // Check payment status from gateway if still pending
    if (payment.status === 'pending') {
      if (payment.gateway === 'phonepe' && payment.phonepeTransactionId) {
        // Check PhonePe payment status
        const statusCheck = await phonepeService.checkPaymentStatus(payment.phonepeTransactionId);
        
        if (statusCheck.success && statusCheck.data) {
          const responseData = statusCheck.data;
          const newStatus = phonepeService.convertPaymentStatus(responseData.state);
          
          // Extract detailed payment information
          const paymentDetails = phonepeService.extractPaymentDetails(responseData);
          
          // Prepare update object with all available data from PhonePe response
          const updateData = {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : null,
            gatewayResponse: JSON.stringify(responseData)
          };
          
          // Update with extracted payment details
          if (paymentDetails.transactionId) {
            updateData.phonepePaymentId = paymentDetails.transactionId;
            updateData.transactionId = paymentDetails.transactionId;
          }
          
          // Update payment method
          if (paymentDetails.paymentMethod) {
            updateData.paidVia = phonepeService.convertPaymentMethod(paymentDetails.paymentMethod);
          }
          
          // Update bank information
          if (paymentDetails.bankId) {
            updateData.bankId = paymentDetails.bankId;
          }
          
          if (paymentDetails.bankTransactionId) {
            updateData.bankRefNo = paymentDetails.bankTransactionId;
          }
          
          // Update authorization and reference codes
          if (paymentDetails.authorizationCode) {
            updateData.authorizationCode = paymentDetails.authorizationCode;
          }
          
          if (paymentDetails.arn) {
            updateData.arn = paymentDetails.arn;
          }
          
          if (paymentDetails.brn) {
            updateData.brn = paymentDetails.brn;
          }
          
          if (paymentDetails.serviceTransactionId) {
            updateData.serviceTransactionId = paymentDetails.serviceTransactionId;
          }
          
          // Update payment reference number if not already set
          if (!payment.paymentRefNo) {
            updateData.paymentRefNo = payment.phonepeTransactionId;
          }
          
          console.log('Updating payment with detailed PhonePe response data:', {
            paymentId: payment.id,
            newStatus,
            updateFields: Object.keys(updateData),
            paymentDetails: {
              transactionId: paymentDetails.transactionId,
              paymentMethod: paymentDetails.paymentMethod,
              bankId: paymentDetails.bankId,
              amount: paymentDetails.amount
            }
          });
          
          // Update payment record
          await payment.update(updateData);
          
          paymentStatus = newStatus;
        }
      } else if (payment.gateway === 'razorpay' && payment.razorpayOrderId) {
        // Check Razorpay payment status
        try {
          const razorpayOrder = await razorpayInstance.orders.fetch(payment.razorpayOrderId);
          
          if (razorpayOrder.status === 'paid') {
            await payment.update({
              status: 'completed',
              completedAt: new Date()
            });
            paymentStatus = 'completed';
          }
        } catch (razorpayError) {
          console.error('Razorpay status check error:', razorpayError);
        }
      }
    }

    // Process successful payment
    if (paymentStatus === 'completed') {
      // Create user subscription if not exists
      const existingUserSub = await UserSubscription.findOne({
        where: { paymentId: payment.id }
      });

      if (!existingUserSub) {
        const validFrom = new Date();
        const validTo = new Date();
        validTo.setDate(validTo.getDate() + payment.subscription.validityDays);

        userSubscription = await UserSubscription.create({
          userEmail: payment.userEmail,
          subscriptionId: payment.subscriptionId,
          paymentId: payment.id,
          validFrom,
          validTo,
          bufferDays: 0,
          activeStatus: true
        });
      } else {
        userSubscription = existingUserSub;
      }

      message = 'Payment completed successfully! Your subscription is now active.';
      nextAction = 'redirect_to_gym';
    } else if (paymentStatus === 'failed') {
      message = 'Payment failed. Please try again or contact support.';
      nextAction = 'retry_payment';
    } else if (paymentStatus === 'cancelled') {
      message = 'Payment was cancelled. You can retry the payment anytime.';
      nextAction = 'retry_payment';
    } else {
      message = 'Payment is still being processed. Please wait a moment and refresh.';
      nextAction = 'wait_and_refresh';
    }

    return {
      payment,
      subscription: payment.subscription,
      gym: payment.subscription?.gym,
      userSubscription,
      message,
      nextAction
    };

  } catch (error) {
    console.error('Process payment status error:', error);
    throw error;
  }
}

module.exports = {
  createOrderWithRazorpay,
  determinePaymentGateway,
  initiatePayment,
  createRazorpayPayment,
  createPhonepePayment,
  handleRazorpayCallback,
  handlePhonepeCallback,
  processPaymentStatus,
  calculateCommissionWithGST
};

