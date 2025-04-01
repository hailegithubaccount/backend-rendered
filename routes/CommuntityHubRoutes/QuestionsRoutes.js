const express = require("express");
const router = express.Router();
const questionController = require("../../controller/CommunityHubController/questionContoller")
const { protect,checkRole, checkUserExists} = require('../../middleware/auth'); 







router.post('/',protect,checkRole("student"), checkUserExists, questionController.createQuestion);

router.get('/',protect,checkRole("student"), checkUserExists, questionController.getAllQuestions);
router.get('/:id',protect,checkRole("student"), checkUserExists, questionController.getQuestion);
// Student-only routes







// Author or Admin routes
router.patch('/:id',protect,checkRole("student"), checkUserExists, questionController.updateQuestion);
router.delete('/:id',protect,checkRole("student"), checkUserExists, questionController.deleteQuestion);

// Voting routes (authenticated users)
router.post('/:id/upvote',protect, questionController.upvoteQuestion);
router.post('/:id/downvote',protect, questionController.downvoteQuestion);

module.exports = router;