const express = require('express');
const router = express.Router()
const StudentController = require('../controller/StudentController');
const { protect, checkRole, checkUserExists } = require('../middleware/auth');

const multer = require('multer');
const upload = multer();// Import the multer configuration

// Register a student with photo
// Register student with photo upload
router.post('/register', upload.single('photo'),StudentController.registerStudent);

// Get all students (admin only)
router.get('/admin/student', protect, checkRole('admin'),StudentController.getAllStudent);

// Get student photo
router.get('/:id/photo', StudentController.getStudentPhoto);


  router.delete(
    "/admin/student/:id",
    protect,
    checkRole("admin"), 
    checkUserExists,
    StudentController.deleteStudent
  );


module.exports = router;