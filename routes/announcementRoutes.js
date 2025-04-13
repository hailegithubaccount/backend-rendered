const express = require("express");
const router = express.Router();
const statusController = require("../controller/AnnouncementController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); // Ensure these are imported correctly

router.post("/createAnnouncement",protect,checkRole("library-staff"), checkUserExists, statusController.createAnnouncement);
router.get("/read",AnnouncementController.getAllAnnouncements);
router.delete("/delete/:AnnouncementId",protect, checkRole("library-staff"), checkUserExists, statusController.deleteAnnouncement); 


module.exports = router;