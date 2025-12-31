const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const OwnerGymController = require('../controllers/ownerGymController');
const OwnerWalletController = require('../controllers/ownerWalletController');

// All routes require authentication and owner role (role '2')

// Gym management routes
router.get('/gym', authenticate, authorize('2'), OwnerGymController.getOwnerGym);
router.put('/gym', authenticate, authorize('2'), OwnerGymController.updateOwnerGym);
router.get('/gym/stats', authenticate, authorize('2'), OwnerGymController.getGymStats);

// Wallet management routes
router.get('/wallet', authenticate, authorize('2'), OwnerWalletController.getWalletOverview);
router.get('/wallet/transactions', authenticate, authorize('2'), OwnerWalletController.getTransactions);
router.post('/wallet/payout', authenticate, authorize('2'), OwnerWalletController.requestPayout);

module.exports = router;