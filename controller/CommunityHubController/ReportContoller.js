const Question = require("../../model/CommutiyHUbmodel/question");
const Answer = require("../../model/CommutiyHUbmodel/answer");
const Report = require("../../model/CommutiyHUbmodel/report");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');


const createReport = asyncHandler(async (req, res) => {
  const { entityType, entityId, reason } = req.body;
  const reporterId = res.locals.id;

  // Validate input
  if (!["question", "answer"].includes(entityType)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid entity type. Must be 'question' or 'answer'",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid entity ID",
    });
  }

  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({
      status: "failed",
      message: "Reason must be at least 10 characters",
    });
  }

  // Check if the entity exists
  let entity;
  if (entityType === "question") {
    entity = await Question.findById(entityId);
  } else if (entityType === "answer") {
    entity = await Answer.findById(entityId);
  }

  if (!entity) {
    return res.status(404).json({
      status: "failed",
      message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`,
    });
  }

  // Create the report
  const report = await Report.create({
    reporter: reporterId,
    entityType,
    entityId,
    reason: reason.trim(),
  });

  res.status(201).json({
    status: "success",
    data: report,
  });
});

// @desc    Resolve or delete a report
// @route   PATCH /api/reports/:reportId
// @access  Private (library-staff only)
const resolveReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const action = req.body.action; // "resolve" or "delete"
  const resolvedById = res.locals.id;

  // Validate report ID
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid report ID",
    });
  }

  // Find the report
  const report = await Report.findById(reportId);
  if (!report) {
    return res.status(404).json({
      status: "failed",
      message: "Report not found",
    });
  }

  // Check if the user is library staff
  if (res.locals.role !== "library-staff") {
    return res.status(403).json({
      status: "failed",
      message: "Only library staff can resolve reports",
    });
  }

  // Resolve the report
  if (action === "resolve") {
    report.isResolved = true;
    report.resolvedBy = resolvedById;
    report.resolvedAt = Date.now();
    await report.save();

    return res.status(200).json({
      status: "success",
      message: "Report marked as resolved",
      data: report,
    });
  }

  // Delete the reported entity
  if (action === "delete") {
    const { entityType, entityId } = report;

    if (entityType === "question") {
      await Question.findByIdAndDelete(entityId);
    } else if (entityType === "answer") {
      await Answer.findByIdAndDelete(entityId);
    }

    // Mark the report as resolved
    report.isResolved = true;
    report.resolvedBy = resolvedById;
    report.resolvedAt = Date.now();
    await report.save();

    return res.status(200).json({
      status: "success",
      message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted successfully`,
    });
  }

  // Invalid action
  return res.status(400).json({
    status: "failed",
    message: "Invalid action. Must be 'resolve' or 'delete'",
  });
});

module.exports = {
  createReport,
  resolveReport,
};