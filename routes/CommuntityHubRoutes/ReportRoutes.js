const express = require("express");
const router = express.Router();
const reportController = require("../../controller/CommunityHubController/ReportContoller")
const { protect,checkRole, checkUserExists} = require('../../middleware/auth'); 



router.post("/",protect,checkRole("student"),checkUserExists,reportController.createReport);

router.patch("/:reportId", protect, checkRole("library-staff"),checkUserExists,reportController.resolveReport);



module.exports = router;
