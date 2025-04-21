const SupportRequest = require('../model/SupportRequest');
const asyncHandler = require('express-async-handler');

// @desc    Create new support request
// @route   POST /api/support
// @access  Private (Students)
const createSupportRequest = asyncHandler(async (req, res) => {
  const { message, requestType, priority } = req.body;

  if (req.file) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Only JPEG/PNG/GIF images allowed'
      });
    }

    // Check file size (5MB max)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 5MB limit'
      });
    }
  }

  // Validation
  if (!message) {
    return res.status(400).json({ 
      success: false,
      error: 'Message is required' 
    });
  }

  try {
    const newRequest = await SupportRequest.create({
      user: req.user.id,
      message,
      requestType,
      priority,
      photo: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : undefined
    });

    res.status(201).json({
      success: true,
      data: newRequest
    });

  } catch (error) {
    console.error('Support request error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get all support requests
// @route   GET /api/support
// @access  Private (Staff/Admin)
const getSupportRequests = asyncHandler(async (req, res) => {
  try {
    const requests = await SupportRequest.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get request photo
// @route   GET /api/support/:id/photo
// @access  Public
const getSupportPhoto = asyncHandler(async (req, res) => {
  try {
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
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = {
  createSupportRequest,
  getSupportRequests,
  getSupportPhoto
};