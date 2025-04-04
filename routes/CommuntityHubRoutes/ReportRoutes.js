const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, checkRole, checkUserExists } = require('../middleware/authMiddleware');

// Create report - using URL parameters
router.post('/report/:entityType/:entityId', protect, reportController.createReport);

// Resolve report - unchanged
router.patch('/:reportId', protect, checkRole("library-staff"), checkUserExists, reportController.resolveReport);

module.exports = router;