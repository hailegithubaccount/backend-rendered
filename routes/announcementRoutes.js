const express = require("express");
const router = express.Router();
const AnnouncementController = require("../controller/announcementController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); // Ensure these are imported correctly

router.post("/createAnnouncement",protect,checkRole("library-staff"), checkUserExists, AnnouncementController.createAnnouncement);


module.exports = router;