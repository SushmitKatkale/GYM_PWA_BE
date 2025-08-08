const paymentService = require('../services/paymentService');
const { User, Gym, Subscription } = require('../models');
const { Op } = require('sequelize');
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

module.exports = {
  createPaymentAndInvoice,
  searchOwners,
  searchGyms,
  searchSubscriptions
};
