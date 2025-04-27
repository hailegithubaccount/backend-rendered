const SupportRequest = require('../model/SupportRequest');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Create new support request
// @route   POST /api/support
// @access  Private (Students)
const createSupportRequest = asyncHandler(async (req, res) => {
  const { message, requestType = 'other', priority = 'medium' } = req.body;

  // ===== 1. VALIDATION CHECKS =====
  if (!message) {
    return res.status(400).json({ 
      success: false,
      error: 'Message is required' 
    });
  }

  // Verify user role
  if (res.locals.role !== 'student') {
    return res.status(403).json({
      success: false,
      error: 'Only students can submit support requests'
    });
  }

  // RequestType enum validation
  const validTypes = ['book-issue', 'facility-problem', 'equipment-failure', 'other'];
  if (!validTypes.includes(requestType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid requestType. Allowed values: ${validTypes.join(', ')}`
    });
  }

  // File validation (if uploaded)
  if (req.file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Only JPEG/PNG/GIF images allowed'
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 5MB limit'
      });
    }
  }

  // ===== 2. MONGOOSE OPERATION =====
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newRequest = await SupportRequest.create([{
      user: res.locals.id, // Using res.locals.id instead of req.user.id
      message,
      requestType,
      priority,
      photo: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : undefined
    }], { session });

    await session.commitTransaction();

    const result = newRequest[0].toObject({ virtuals: true });
    result.photoUrl = result.photo?.data ? 
      `${req.protocol}://${req.get('host')}/api/support/${result._id}/photo` : 
      null;

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('[Support Request Error]', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${errors.join(', ')}`
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate request detected'
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Server error'
    });
  } finally {
    session.endSession();
  }
});

// @desc    Get all support requests
// @route   GET /api/support
// @access  Private (Staff/Admin)
const getSupportRequests = asyncHandler(async (req, res) => {
    try {
      // 1. Role Verification
      if (res.locals.role !== "library-staff") {
        return res.status(403).json({
          status: "failed",
          message: "Only library-staff can view support requests",
        });
      }
  
      // 2. Database Query - Fixed populate path
      const requests = await SupportRequest.find({})
        .populate({
          path: 'user',  // Changed from 'users' to 'user'
          select: 'firstName lastName email',
          // match: { status: 'active' }  // Removed temporarily for debugging
        })
        .sort({ createdAt: -1 })
        .lean();
  
      // 3. Debug logging
      console.log('Raw requests from DB:', requests);
      
      // 4. Add photo URLs
      const requestsWithPhotoUrls = requests.map(request => ({
        ...request,
        photoUrl: request.photo?.data 
          ? `${req.protocol}://${req.get('host')}/api/support/${request._id}/photo`
          : null
      }));
  
      res.status(200).json({
        success: true,
        count: requestsWithPhotoUrls.length,
        data: requestsWithPhotoUrls
      });
  
    } catch (error) {
      console.error('[Get Requests Error]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
  
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve support requests',
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            error: error.message,
            type: error.name,
            stack: error.stack
          }
        })
      });
    }
  });

// @desc    Get request photo
// @route   GET /api/support/:id/photo
// @access  Public
const getSupportPhoto = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request ID'
      });
    }

    const request = await SupportRequest.findById(req.params.id)
      .select('photo -_id');

    if (!request?.photo?.data) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    res.set('Content-Type', request.photo.contentType);
    res.send(request.photo.data);

  } catch (error) {
    console.error('[Get Photo Error]', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});
// @desc    Count all support requests
// @route   GET /api/support/count
// @access  Private (Staff/Admin)
const countSupportRequests = asyncHandler(async (req, res) => {
  try {
    // 1. Role Verification
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Only library-staff can count support requests",
      });
    }

    // 2. Count requests in the database
    const count = await SupportRequest.countDocuments();

    res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('[Count Requests Error]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count support requests',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          error: error.message,
          type: error.name,
          stack: error.stack
        }
      })
    });
  }
});


module.exports = {
  createSupportRequest,
  getSupportRequests,
  getSupportPhoto,
  countSupportRequests,
};