const { sequelize, UserSubscription, Payment, Invoice, Subscription } = require('../models'); // Import models

const purchaseSubscriptionTransactional = async (userEmail, subscriptionId, paymentDetails, invoicePath) => {
  const transaction = await sequelize.transaction(); // Start transaction
  try {
    // Create payment record
    const payment = await Payment.create({
      ...paymentDetails,
      userEmail
    }, { transaction });

    // Create user subscription record
    const userSubscription = await UserSubscription.create({
      userEmail,
      subscriptionId,
      paymentId: payment.id,
      validFrom: new Date(),
      // Assuming 'validTo' is calculated elsewhere in your logic based on plan duration
      validTo: new Date(),
    }, { transaction });

    // Create invoice record
    await Invoice.create({
      paymentId: payment.id,
      path: invoicePath,
      // Assuming other invoice fields, fill as necessary
    }, { transaction });

    await transaction.commit(); // Commit transaction
    return { success: true, userSubscription, payment };
  } catch (error) {
    await transaction.rollback(); // Rollback transaction
    console.error('Error during subscription transaction:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { purchaseSubscriptionTransactional }; // Export service function
