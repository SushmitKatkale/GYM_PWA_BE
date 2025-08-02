const { Router } = require('express');
const { getOwners, createOwner, updateOwner, deleteOwner, searchOwners } = require('../controllers/ownerController');

const router = Router();

router.get('/', getOwners);
router.get('/search', searchOwners);
router.post('/', createOwner);
router.put('/:id', updateOwner);
router.delete('/:id', deleteOwner);

module.exports = router;
