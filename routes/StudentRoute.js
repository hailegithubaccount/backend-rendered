const express = require("express");
const router = express.Router();
const StudentController= require("../controller/StudentController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 


router.post('/register', StudentController.registerStudent);
router.get("/admin/student",
  protect,
  checkRole("admin"), 
  checkUserExists,
  StudentController.getAllStudent);

  router.delete(
    "/admin/student/:id",
    protect,
    checkRole("admin"), 
    checkUserExists,
    StudentController.deleteStudent
  );


module.exports = router;