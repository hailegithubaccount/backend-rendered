const express = require('express');
const router = express.Router();
const reportController = require('../../controller/CommunityHubController/ReportContoller');
const { protect,checkRole, checkUserExists} = require('../../middleware/auth'); 

// Create report - using URL parameters
router.post('/report/:entityType/:entityId', protect, reportController.createReport);

// Resolve report - unchanged
router.patch('/:reportId', protect, checkRole("library-staff"), checkUserExists, reportController.handleReportAction);
router.get('/', reportController.getAllReports);
router.get('/count', reportController.countReports);

module.exports = router;