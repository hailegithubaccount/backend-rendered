const express = require('express');
const router = express.Router();
const studyController = require('../controller/studyController');

// You should protect these routes with auth middleware if needed

router.post('/addChapter', studyController.addChapter);
router.get('/getChapterPages/:chapterId', studyController.getChapterPages);
router.post('/markPageRead', studyController.markPageRead);
router.get('/getProgress/:chapterId', studyController.getProgress);

module.exports = router;
