const express = require('express');
const router = express.Router();
const studentController = require('../controller/StudentController');
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 
const multer = require('multer');
const upload = multer();

// Register student with photo upload
router.post('/register', upload.single('photo'), studentController.registerStudent);

// Get all students (admin only)
router.get('/', studentController.getAllStudents);

// Get student photo
router.get('/:id/photo', studentController.getStudentPhoto);

router.get("/profile",  protect, checkRole('student'), checkUserExists,studentController.getStudentProfile );



  router.delete(
    "/admin/student/:id",
    protect, checkRole('admin'), checkUserExists,
    studentController.deleteStudent
  );


module.exports = router;