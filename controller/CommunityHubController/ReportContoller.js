const Question = require("../../model/CommutiyHUbmodel/question");
const Answer = require("../../model/CommutiyHUbmodel/answer");
const Report = require("../../model/CommutiyHUbmodel/report");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');

// @desc    Create a report
// @route   POST /api/report/:entityType/:entityId
// @access  Private
const createReport = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const { reason } = req.body;
  const reporterId = res.locals.id;

  // Validate input
  if (!["question", "answer"].includes(entityType)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid entity type. Must be 'question' or 'answer'",
    });
  }

  // Validate entityId format
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid ID format",
    });
  }

  try {
    // Check if entity exists and get its content
    let entity, content, author;
    
    if (entityType === "question") {
      entity = await Question.findById(entityId)
        .populate('author', 'firstName lastName')
        .lean();
    } else {
      entity = await Answer.findById(entityId)
        .populate('author', 'firstName lastName')
        .lean();
    }

    if (!entity) {
      return res.status(404).json({
        status: "failed",
        message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`,
      });
    }

    // Extract content and author safely
    if (entityType === "question") {
      content = `${entity.title}\n${entity.content}`;
      author = entity.author?._id || null;
    } else {
      content = entity.content;
      author = entity.author?._id || null;
    }

    // Create the report with content
    const report = await Report.create({
      reporter: reporterId,
      entityType,
      entityId,
      content: content || "Content not available", // Fallback if content is empty
      author,  // Store the content author
      reason: reason?.trim() || "No reason provided" // Fallback if reason is empty
    });

    return res.status(201).json({
      status: "success",
      data: report
    });

  } catch (error) {
    console.error("Report creation error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error while creating report",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


const getAllReports= asyncHandler(async (req, res) => {
  const reports = await Report.find()
    .populate('reporter', 'firstName lastName')
    .populate('author', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: reports
  });
});


// @desc    Resolve or delete a report
// @route   PATCH /api/reports/:reportId
// @access  Private (library-staff only)
// @desc    Resolve or delete a report
// @route   PATCH /api/reports/:reportId
// @access  Private (library-staff only)
const handleReportAction = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { action } = req.body;
  const staffId = res.locals.id;

  if (!["resolve", "delete"].includes(action)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid action. Must be 'resolve' or 'delete'",
    });
  }

  const report = await Report.findById(reportId);
  if (!report) {
    return res.status(404).json({
      status: "failed",
      message: "Report not found",
    });
  }

  if (action === "resolve") {
    report.isResolved = true;
    report.resolvedBy = staffId;
    report.resolvedAt = Date.now();
    await report.save();
  } else if (action === "delete") {
    // Delete the reported content
    if (report.entityType === "question") {
      await Question.findByIdAndDelete(report.entityId);
    } else {
      await Answer.findByIdAndDelete(report.entityId);
    }
    // Also delete the report itself
    await Report.findByIdAndDelete(reportId);
  }

  res.status(200).json({
    status: "success",
    data: report
  });
});



const countReports = asyncHandler(async (req, res) => {
  // Optional: only library-staff can view the count


  const count = await Report.countDocuments();
  res.status(200).json({
    status: "success",
    count,
  });
});

module.exports = {
  createReport,
  getAllReports,
  handleReportAction,
  countReports,
};