const express = require('express');
const router = express.Router();
const demandController = require('../controllers/demandController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const billingRoles = authorizeRoles('Super Admin', 'Director', 'Accounts', 'CRM');

router.get('/', verifyToken, demandController.getDemands);
router.post('/raise', verifyToken, billingRoles, demandController.raiseDemand);
router.get('/:id/invoice', verifyToken, demandController.getDemandInvoice);

module.exports = router;
