const express = require('express');
const router = express.Router();
const multer = require('multer');
const AnncomPromotContoller = require('../controller/AnncomPromotContoller');
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// All routes are protected

router.post("/createbyStaff",upload.single('photo'),AnncomPromotContoller.createAnnouncement)

router.get('/SeeAnncoBystudent',protect,checkRole("student"), checkUserExists,AnncomPromotContoller.getAnnouncements);
 
router.get('/:id/photo',AnncomPromotContoller.getAnnouncementPhoto);




module.exports = router;