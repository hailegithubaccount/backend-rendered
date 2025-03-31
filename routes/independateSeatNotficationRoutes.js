const express = require("express");
const router = express.Router();
const independateSeatNotficationController= require("../controller/independateSeatNotficationController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');



router.get("/independantSeatNotfication",protect,checkRole("student"), checkUserExists, independateSeatNotficationController.getSeatNotifications);





module.exports = router;