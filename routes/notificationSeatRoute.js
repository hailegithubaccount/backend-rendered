const express = require("express");
const router = express.Router();
const notificationforseat= require("../controller/NotficationSeatController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');


// router.post("/save-push-token",protect,checkRole("student"), checkUserExists, notificationforseat.savePushToken);
router.get("/seatNotify",protect,checkRole("student"), checkUserExists, notificationforseat.getNotifications);
router.delete("/delete/:id",protect,checkRole("student"), checkUserExists, notificationforseat.deleteNotification);



module.exports = router;