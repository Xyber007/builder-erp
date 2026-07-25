const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/', verifyToken, projectController.getProjects);
router.get('/:id/dashboard', verifyToken, projectController.getProjectDashboard);
router.put('/construction/:stageId', verifyToken, authorizeRoles('Super Admin', 'Director', 'Construction'), projectController.updateConstructionProgress);

module.exports = router;
