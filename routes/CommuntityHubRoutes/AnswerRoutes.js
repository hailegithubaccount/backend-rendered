const express = require("express");
const router = express.Router();
const answerController = require("../../controller/CommunityHubController/answerContoller")
const { protect,checkRole, checkUserExists} = require('../../middleware/auth'); 






// Public routes
router.post('/:questionId/answers',
  protect,
  checkRole("student"), 
  checkUserExists,
  answerController.createAnswer
);

router.get('/:questionId/answers',
  protect,
  checkRole("student"),
  checkUserExists,
  answerController.getAnswersByQuestion
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