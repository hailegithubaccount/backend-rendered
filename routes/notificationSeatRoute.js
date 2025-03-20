const express = require("express");
const router = express.Router();
const notificationforseat= require("../controller/NotficationSeatController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');



router.get("/seatNotify",protect,checkRole("student"), checkUserExists, notificationforseat.getNotifications);


module.exports = router;