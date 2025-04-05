const express = require("express");
const router = express.Router();
const StudentController= require("../controller/StudentController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 


router.post('/register',upload.single('photo'), StudentController.registerStudent);
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