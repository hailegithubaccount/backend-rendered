const express = require('express');
const router = express.Router()
const StudentController = require('../controller/StudentController');
const { protect, checkRole, checkUserExists } = require('../middleware/auth');
const upload = require('../conj/conj'); // Import the multer configuration

// Register a student with photo
router.post('/register', upload, StudentController.registerStudent);

// Get all students
router.get(
  '/admin/student',
  protect,
  checkRole('admin'),
  checkUserExists,
  StudentController.getAllStudent
);



  router.delete(
    "/admin/student/:id",
    protect,
    checkRole("admin"), 
    checkUserExists,
    StudentController.deleteStudent
  );


module.exports = router;