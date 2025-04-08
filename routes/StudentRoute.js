const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const StudentController = require('../controller/StudentController');
const { protect, checkRole, checkUserExists } = require('../middleware/auth');
const upload = require('../cong/multer.config');

// Serve uploaded image by filename
router.get('/image/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ error: 'Image not found' });
    
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    
    res.set('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

// Routes
router.post('/register', upload.single('photo'), StudentController.registerStudent);
router.get('/admin/student', protect, checkRole('admin'), checkUserExists, StudentController.getAllStudents);
router.delete('/admin/student/:id', protect, checkRole('admin'), checkUserExists, StudentController.deleteStudent);

module.exports = router;
