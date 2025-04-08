const express = require("express");
const router = express.Router();
const StudentController= require("../controller/StudentController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `student-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  allowedTypes.includes(file.mimetype) 
    ? cb(null, true) 
    : cb(new Error('Only JPEG/JPG/PNG files allowed'), false);
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});




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