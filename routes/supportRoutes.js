const express = require('express');
const router = express.Router();
const supportController = require('../controller/supportController');
const multer = require('multer');
const upload = multer();


const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 

// Student routes
router.post(
  '/',
  protect, checkRole('student'), checkUserExists, 
  upload.single('photo'),
  supportController.createSupportRequest
);



// Staff routes
router.get(
  '/',
  
  supportController.getSupportRequests
);



router.get(
  '/count',
 
  supportController.countSupportRequests
);

// Photo access
router.get('/:id/photo', supportController.getSupportPhoto);




module.exports = router;