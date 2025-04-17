const express = require("express");
const router = express.Router();
const notificationtostudent= require("../controller/notficationtoStudent");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');



router.get("/notifystudent",protect,checkRole("student"), checkUserExists, notificationtostudent.getNotifications);
router.delete("/delete/:id",protect,checkRole("student"), checkUserExists, notificationtostudent.deleteNotification);
router.get('/staff/notifications/overdue',protect,checkRole("library-staff"), checkUserExists, notificationtostudent.getStaffOverdueNotifications);



module.exports = router;