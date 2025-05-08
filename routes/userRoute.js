const express = require('express');
const authController = require('../controller/authController');
const { protect,checkRole, checkUserExists} = require('../middleware/auth');  // ✅ Import protect & isAdmin

const router = express.Router();

// Public routes

//router.post('/regsterAdmin',authController.registerAdmin)

router.post('/login', authController.login);
router.post("/forgetPassword",authController.forgetPassword);
router.post("/confirmOtp", authController.otpVerification);
router.put("/resetPassword", authController.resetPassword);

// routes require login
router.patch("/updatePassword",protect, checkRole('student'), checkUserExists, authController.updatePassword);








// Admin dashboard route
router.get('/admin', protect, checkRole('admin'), checkUserExists, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Welcome to the admin dashboard!',
        user: res.locals.user
    });
});

// User dashboard route
router.get('/library-staff', protect, checkRole('library-staff'), checkUserExists, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Welcome to the user dashboard!',
        user: res.locals.user
    });
});

module.exports = router;


// Get all users (only accessible by authenticated users)
// router.get('/', protect, authController.getAllUser);


