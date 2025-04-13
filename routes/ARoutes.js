const express = require("express");
const router = express.Router();
const AnnouncementController =require("../controller/AController.js")
const { protect,checkRole, checkUserExists} = require('../middleware/auth.js');

console.log(AnnouncementController);// Ensure these are imported correctly

router.post("/createAnnouncement",protect,checkRole("library-staff"), checkUserExists, AnnouncementController.createAnnouncement);
router.get("/read",AnnouncementController.getAllAnnouncements);
router.delete("/delete/:AnnouncementId",protect, checkRole("library-staff"), checkUserExists, AnnouncementController.deleteAnnouncement); 


module.exports = router;