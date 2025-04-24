const express = require("express");
const router = express.Router();
const messageController = require("../controller/messageN");

// ✅ Staff - Add Message

router.post('/create-motivation-tip', messageController.createMotivationTip);
router.get('/random-motivation-tip', messageController.getRandomMotivationTip);

// ✅ Student - Fetch Latest Message



module.exports = router;
