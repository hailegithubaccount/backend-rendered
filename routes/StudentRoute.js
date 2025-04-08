const express = require("express");
const router = express.Router();
const StudentController = require("../controller/StudentController");
const { protect, checkRole, checkUserExists } = require('../middleware/auth'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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

// Photo Serving Route - Add this new endpoint
router.get('/photo/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({
        status: 'error',
        message: 'Photo not found'
      });
    }
    
    // Set proper content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // default
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    // Send the file with proper headers
    res.set('Content-Type', contentType);
    res.sendFile(filePath);
  });
});

// Existing routes
router.post('/register', upload.single('photo'), StudentController.registerStudent);
router.get("/admin/student",
  protect,
  checkRole("admin"), 
  checkUserExists,
  StudentController.getAllStudent);

module.exports = router;