const express = require("express");
const router = express.Router();
const answerController = require("../../controller/CommunityHubController/answerContoller")
const { protect,checkRole, checkUserExists} = require('../../middleware/auth'); 






// Public routes
router.get('/',protect,checkRole("student"), checkUserExists, answerController.getAnswersForQuestion);

// Protected routes


// Student-only routes
router.post('/questions/:questionId/answers',
    protect,
    checkRole("student"), 
    checkUserExists,
    // Add this
    answerController.createAnswer
  );
// Author or Admin routes
// router.patch('/:id', answerController.updateAnswer);
router.delete('/:id', answerController.deleteAnswer);

// Question author only routes
router.patch('/:id/accept',protect,checkRole("student"), checkUserExists,answerController.acceptAnswer);

// Voting routes
router.post('/:id/upvote', answerController.upvoteAnswer);
router.post('/:id/downvote', answerController.downvoteAnswer);

module.exports = router;