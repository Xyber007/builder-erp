const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/', verifyToken, authorizeRoles('Super Admin', 'Director', 'Accounts', 'Sales'), paymentController.createPayment);
router.get('/:id/receipt', verifyToken, paymentController.getReceipt);

module.exports = router;
