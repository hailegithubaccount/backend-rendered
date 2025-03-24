const express = require("express");
const router = express.Router();
const messageController = require("../controller/messageN");

// ✅ Staff - Add Message
router.post("/addMessage", messageController.addMessage);

// ✅ Student - Fetch Latest Message
router.get("/getMessage", messageController.getLatestMessage);

// ✅ Student - Respond to Message
router.post("/respond", messageController.respondToMessage);

module.exports = router;
