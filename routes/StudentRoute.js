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
router.get ('/count',studentController.countStudents);



  
  router.patch('/students/:id/disable',
    protect, checkRole('admin'), checkUserExists,
    studentController. disableStudent
    
  );


  router.patch('/students/:id/enable',
    protect, checkRole('admin'), checkUserExists,
    studentController.enableStudent

  );


module.exports = router;