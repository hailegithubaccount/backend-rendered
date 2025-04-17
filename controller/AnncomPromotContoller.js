const Announcement = require('../model/AnncuProm');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const createAnnouncement = asyncHandler(async (req, res) => {
  try {
    const { title, message, priority, targetRoles } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and message are required'
      });
    }

    // Only library-staff can create announcements
    if (res.locals.role !== 'library-staff') {
      return res.status(403).json({
        status: 'error',
        message: 'Only library staff can create announcements'
      });
    }

    // Validate photo if uploaded
    if (req.file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          status: 'error',
          message: 'Only JPEG, PNG, and GIF images are allowed'
        });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          status: 'error',
          message: 'Image size exceeds 5MB limit'
        });
      }
    }

    // Create announcement
    const announcement = await Announcement.create({
      title,
      message,
      photo: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : undefined,
      priority: priority || 'medium',
      targetRoles: targetRoles || ['all'],
      postedBy: res.locals.id
    });

    // Populate the postedBy details
    await announcement.populate('postedByDetails');

    // Generate photo URL if photo exists
    const photoUrl = announcement.photo
      ? `${req.protocol}://${req.get('host')}/api/announcements/${announcement._id}/photo`
      : null;

    res.status(201).json({
      status: 'success',
      message: 'Announcement created successfully',
      data: {
        ...announcement.toObject(),
        photoUrl
      }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Duplicate announcement title'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});



// @desc    Get all announcements (filtered by role)
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = asyncHandler(async (req, res) => {
  try {
    // Debug: Check user information
    console.log('User role:', res.locals.role);
    console.log('User ID:', res.locals.id);

    // Build filter based on user role
    const filter = { isActive: true }; // Start with base filter
    
    if (res.locals.role !== 'library-staff') {
      filter.$or = [
        { targetRoles: 'all' },
        { targetRoles: res.locals.role }
      ];
    }

    // Debug: Check the constructed filter
    console.log('Database filter:', filter);

    const announcements = await Announcement.find(filter)
      .populate({
        path: 'postedByDetails',
        select: 'firstName lastName email role'
      })
      .sort({ priority: -1, createdAt: -1 })
      .lean(); // Using lean() for better performance

    // Add photo URL to each announcement
    const announcementsWithPhotoUrl = announcements.map(announcement => ({
      ...announcement,
      photoUrl: announcement.photo
        ? `${req.protocol}://${req.get('host')}/api/announcements/${announcement._id}/photo`
        : null
    }));

    res.status(200).json({
      status: 'success',
      results: announcements.length,
      data: announcementsWithPhotoUrl
    });

  } catch (error) {
    console.error('Get announcements error:', error.stack); // More detailed error logging
    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error'
    });
  }
});

// @desc    Get announcement photo
// @route   GET /api/announcements/:id/photo
// @access  Private
const getAnnouncementPhoto = asyncHandler(async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        status: "error", 
        message: "Invalid announcement ID format" 
      });
    }

    // Find announcement with only photo data
    const announcement = await Announcement.findById(req.params.id)
      .select('photo -_id');

    if (!announcement?.photo?.data) {
      return res.status(404).json({ 
        status: "error", 
        message: "Photo not found for this announcement" 
      });
    }

    // Convert data to Buffer if it isn't already
    const photoData = Buffer.isBuffer(announcement.photo.data) 
      ? announcement.photo.data 
      : Buffer.from(announcement.photo.data);
    
    // Ensure content type is set
    const contentType = announcement.photo.contentType || 'image/jpeg';

    // Set headers safely
    res.set({
      'Content-Type': contentType,
      'Content-Length': photoData.length.toString(),
      'Cache-Control': 'public, max-age=86400'
    });
    
    return res.send(photoData);
  } catch (error) {
    console.error("Error fetching announcement photo:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementPhoto
};