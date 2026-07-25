const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/', verifyToken, customerController.getCustomers);
router.get('/:id', verifyToken, customerController.getCustomerProfile);
router.post('/:id/notes', verifyToken, authorizeRoles('Super Admin', 'Director', 'CRM', 'Sales'), customerController.addCustomerNote);
router.put('/:id/legal', verifyToken, authorizeRoles('Super Admin', 'Director', 'Legal'), customerController.updateLegalStatus);

module.exports = router;
