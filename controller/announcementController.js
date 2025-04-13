const asyncHandler = require("express-async-handler");
const Announcement = require("../model/Announcement");
const mongoose = require('mongoose');

// Create an announcement
const createAnnouncement = asyncHandler(async (req, res) => {
  try {
    const { title, description, startDate, endDate, isLibraryClosed } = req.body;

    // Role-based access control
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Only library-staff can create an announcement",
      });
    }

    // Input validation
    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({
        status: "failed",
        message: "All fields (title, description, startDate, endDate) are required",
      });
    }

    // Validate date range
    const currentDate = new Date();
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (parsedStartDate > parsedEndDate) {
      return res.status(400).json({
        status: "failed",
        message: "Start date must be before or equal to end date",
      });
    }

    if (parsedStartDate < currentDate) {
      return res.status(400).json({
        status: "failed",
        message: "Start date cannot be in the past",
      });
    }

    // Create the announcement
    const announcement = await Announcement.create({
      title,
      description,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      isLibraryClosed,
      managedBy: res.locals.id, // Assuming `res.locals.id` contains the ID of the logged-in user
    });

    // Return success response
    res.status(201).json({
      status: "success",
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Get all announcements
const getAllAnnouncements = asyncHandler(async (req, res) => {
  try {
    // Fetch all announcements from the database
    const announcements = await Announcement.find().sort({ createdAt: -1 }); // Sort by most recent

    // Return success response with the list of announcements
    res.status(200).json({
      status: "success",
      message: "All status fetched successfully",
      data: announcements,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch announcements",
      error: error.message,
    });
  }
});

// Delete an announcement
// Delete an announcement
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { AnnouncementId } = req.params;

  // 1. Validate ID format
  if (!mongoose.Types.ObjectId.isValid(AnnouncementId)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid announcement ID format",
      details: {
        providedId: AnnouncementId,
        expectedFormat: "24-character hexadecimal MongoDB ObjectId"
      }
    });
  }

  try {
    // 2. Find and delete the announcement
    const deletedAnnouncement = await Announcement.findOneAndDelete({
      _id: AnnouncementId
    });

    // 3. Check if announcement exists
    if (!deletedAnnouncement) {
      return res.status(404).json({
        status: "failed",
        message: "status not found or already deleted",
        details: `No announcement found with ID: ${AnnouncementId}`
      });
    }

    // 4. Success response
    return res.status(200).json({
      status: "success",
      message: "Announcement deleted successfully",
      data: {
        id: deletedAnnouncement._id,
        title: deletedAnnouncement.title,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    // 5. Handle unexpected errors
    return res.status(500).json({
      status: "error",
      message: "Failed to delete announcement",
      error: {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }
});



module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  deleteAnnouncement, // Export the deleteAnnouncement function
};