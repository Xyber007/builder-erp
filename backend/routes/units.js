const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, unitController.getUnits);
router.get('/:id', verifyToken, unitController.getUnitDetails);

module.exports = router;
