const { Router } = require('express');
const { getOwners, createOwner, updateOwner, deleteOwner, searchOwners } = require('../controllers/ownerController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, authorize(['admin']), getOwners);
router.get('/search', authenticate, authorize(['admin']), searchOwners);
router.post('/', authenticate, authorize(['admin']), createOwner);
router.put('/:id', authenticate, authorize(['admin']), updateOwner);
router.delete('/:id', authenticate, authorize(['admin']), deleteOwner);

module.exports = router;
