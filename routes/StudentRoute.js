const express = require('express');
const router = express.Router();
const StudentController = require('../controller/StudentController');
const { protect, checkRole } = require('../middleware/auth');
const upload = require('../cong/multer.config');

// Image serving endpoint
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

// Existing routes
router.post('/register', upload.single('photo'), StudentController.registerStudent);
router.get('/admin/student', protect, checkRole('admin'), StudentController.getAllStudents);



  router.delete(
    "/admin/student/:id",
    protect,
    checkRole("admin"), 
    checkUserExists,
    StudentController.deleteStudent
  );


module.exports = router;