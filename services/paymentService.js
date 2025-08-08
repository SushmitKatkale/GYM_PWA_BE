const Razorpay = require('razorpay');
const { Payment, Invoice, VendorPaymentConfig, Subscription, Gym } = require('../models');
const { generateInvoicePDF } = require('../utils/invoiceUtils');

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

module.exports = {
  createOrderWithRazorpay,
};

