const express = require("express");
const RequestController = require("../controller/RequestController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');  // Ensure authentication

const router = express.Router();

router.post("/request",protect,checkRole("student"), checkUserExists,RequestController.requestBook);
router.get("/request",protect,checkRole("library-staff"), checkUserExists,RequestController. getAllBookRequests); // // Auth required
router.patch("/taken/:requestId", protect, checkRole("library-staff"), checkUserExists, RequestController.approveBookRequest);
router.patch(
    "/bookrequest/:requestId/return",
    protect,
    checkUserExists,  // Ensure user exists
    checkRole("library-staff"),  // Only library staff can confirm returns
    RequestController.returnBook
  );
router.delete("/delete/:requestId",protect, checkRole("library-staff"), checkUserExists, RequestController.deleteBookRequest);  


//
router.get("/count",protect,checkRole("library-staff"), checkUserExists,RequestController.getDetailedRequestCounts); 
router.get("//pending-count",protect,checkRole("library-staff"), checkUserExists,RequestController.getPendingRequests );

 


module.exports = router;
