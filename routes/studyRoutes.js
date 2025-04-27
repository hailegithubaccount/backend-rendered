const express = require('express');
const router = express.Router();
const studyController = require('../controller/studyController');
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 

// You should protect these routes with auth middleware if needed

router.post('/addChapter', protect, checkRole('student'), checkUserExists, studyController.addChapter);
router.get('/getChapterPages/:chapterId', protect, checkRole('student'), checkUserExists, studyController.getChapterPages);
router.post('/markPageRead', protect, checkRole('student'), checkUserExists, studyController.markPageRead);
router.get('/getProgress/:chapterId', protect, checkRole('student'), checkUserExists, studyController.getProgress);

module.exports = router;
