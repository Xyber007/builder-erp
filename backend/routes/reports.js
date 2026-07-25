const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const reportingRoles = authorizeRoles('Super Admin', 'Director', 'Accounts', 'Sales', 'CRM', 'Legal', 'Construction');

router.get('/collections', verifyToken, reportingRoles, reportController.getCollectionsReport);
router.get('/outstanding', verifyToken, reportingRoles, reportController.getOutstandingReport);
router.get('/gst', verifyToken, reportingRoles, reportController.getGstReport);
router.get('/inventory', verifyToken, reportingRoles, reportController.getInventoryReport);

module.exports = router;
