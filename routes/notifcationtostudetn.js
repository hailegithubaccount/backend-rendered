const express = require("express");
const router = express.Router();
const notificationtostudetn = require("../controller/notficationtoStudent");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');



router.get("/notifystudent",protect,checkRole("student"), checkUserExists, notificationtostudetn.getNotifications);