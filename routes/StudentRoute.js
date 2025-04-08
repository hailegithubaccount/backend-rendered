const express = require("express");
const router = express.Router();
const StudentController = require("../controller/StudentController");
const { protect, checkRole, checkUserExists } = require('../middleware/auth');
const multer = require('multer');

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Routes
router.post('/register', upload.single('photo'), StudentController.registerStudent);
router.get("/admin/student", protect, checkRole("admin"), checkUserExists, StudentController.getAllStudent);
router.delete("/admin/student/:id", protect, checkRole("admin"), StudentController.deleteStudent);

module.exports = router;