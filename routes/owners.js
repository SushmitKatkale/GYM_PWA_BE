const { Router } = require('express');
const { getOwners, createOwner, updateOwner, deleteOwner, searchOwners } = require('../controllers/ownerController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

// Admin only routes (type='3')
router.get('/', authenticate, authorize('3'), getOwners);
router.get('/search', authenticate, authorize('3'), searchOwners);
router.post('/', authenticate, authorize('3'), createOwner);
router.put('/:id', authenticate, authorize('3'), updateOwner);
router.delete('/:id', authenticate, authorize('3'), deleteOwner);

module.exports = router;
