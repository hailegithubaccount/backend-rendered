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
      message: "All announcements fetched successfully",
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
  try {
    const snnId = req.params.id; // Extract announcement ID from URL parameters

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(snnId)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid announcement ID. Please provide a valid MongoDB ObjectId.",
      });
    }

    // Role-based access control
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Only library-staff can delete an announcement",
      });
    }

    // Find and delete the announcement
    const deletedAnnouncement = await Announcement.findByIdAndDelete(id);

    // Check if the announcement exists
    if (!deletedAnnouncement) {
      return res.status(404).json({
        status: "failed",
        message: "Announcement not found. Please check the provided ID.",
      });
    }

    // Return success response
    res.status(200).json({
      status: "success",
      message: "Announcement deleted successfully",
      data: deletedAnnouncement,
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error deleting announcement:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to delete announcement",
      error: error.message,
    });
  }
});


module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  deleteAnnouncement, // Export the deleteAnnouncement function
};