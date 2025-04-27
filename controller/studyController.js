const Chapter = require('../model/studyProgress/Chapter');
const Page = require('../model/studyProgress/Page');
const mongoose = require("mongoose");
const Student = require('../model/userModel'); // Make sure you have this model
const asyncHandler = require('express-async-handler');

// Add Chapter (Already Provided)
exports.addChapter = asyncHandler(async (req, res) => {
  const { title, totalPages } = req.body;
  const studentId = res.locals.id;

  // 1. Validate studentId exists and is valid
  if (!studentId) {
    res.status(401);
    throw new Error("Authentication required: No student ID found");
  }

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    res.status(400);
    throw new Error("Invalid student ID format");
  }

  // 2. Verify student exists in database
  const studentExists = await Student.exists({ _id: studentId });
  if (!studentExists) {
    res.status(404);
    throw new Error("Student not found");
  }

  // 3. Create chapter with proper ObjectId reference
  const chapter = await Chapter.create({
    title,
    totalPages,
    student: new mongoose.Types.ObjectId(studentId),
  });

  // 4. Create pages with proper references
  const pages = Array.from({ length: totalPages }, (_, i) => ({
    chapter: chapter._id,
    student: new mongoose.Types.ObjectId(studentId),
    pageNumber: i + 1,
    isRead: false,
  }));

  await Page.insertMany(pages);

  // 5. Return success response with populated data
  const createdChapter = await Chapter.findById(chapter._id)
    .populate('student', 'name email');

  res.status(201).json({
    success: true,
    message: "Chapter and pages created successfully",
    chapter: createdChapter,
    pagesCreated: pages.length,
  });
});

// Get Pages by Chapter
exports.getChapterPages = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;
  const studentId = res.locals.id;

  // 1. Validate chapterId exists and is valid
  if (!chapterId || !mongoose.Types.ObjectId.isValid(chapterId)) {
    res.status(400);
    throw new Error("Invalid chapter ID format");
  }

  // 2. Verify chapter exists and belongs to the authenticated student
  const chapter = await Chapter.findOne({
    _id: chapterId,
    student: new mongoose.Types.ObjectId(studentId),
  });

  if (!chapter) {
    res.status(404);
    throw new Error("Chapter not found or does not belong to the authenticated student");
  }

  // 3. Fetch pages for the chapter
  const pages = await Page.find({ chapter: chapterId }).sort('pageNumber');

  res.status(200).json({
    success: true,
    message: "Pages fetched successfully",
    pages,
  });
});

// Mark Page as Read
exports.markPageRead = asyncHandler(async (req, res) => {
  const { pageId } = req.body;
  const studentId = res.locals.id;

  // 1. Validate pageId exists and is valid
  if (!pageId || !mongoose.Types.ObjectId.isValid(pageId)) {
    res.status(400);
    throw new Error("Invalid page ID format");
  }

  // 2. Verify page exists and belongs to the authenticated student
  const page = await Page.findOne({
    _id: pageId,
    student: new mongoose.Types.ObjectId(studentId),
  });

  if (!page) {
    res.status(404);
    throw new Error("Page not found or does not belong to the authenticated student");
  }

  // 3. Mark page as read
  page.isRead = true;
  await page.save();

  res.status(200).json({
    success: true,
    message: "Page marked as read",
  });
});

// Get Progress for a Chapter
exports.getProgress = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;
  const studentId = res.locals.id;

  // 1. Validate chapterId exists and is valid
  if (!chapterId || !mongoose.Types.ObjectId.isValid(chapterId)) {
    res.status(400);
    throw new Error("Invalid chapter ID format");
  }

  // 2. Verify chapter exists and belongs to the authenticated student
  const chapter = await Chapter.findOne({
    _id: chapterId,
    student: new mongoose.Types.ObjectId(studentId),
  });

  if (!chapter) {
    res.status(404);
    throw new Error("Chapter not found or does not belong to the authenticated student");
  }

  // 3. Calculate progress
  const totalPages = await Page.countDocuments({ chapter: chapterId });
  const completedPages = await Page.countDocuments({ chapter: chapterId, isRead: true });

  const progress = totalPages === 0 ? 0 : Math.round((completedPages / totalPages) * 100);

  res.status(200).json({
    success: true,
    message: "Progress fetched successfully",
    completedPages,
    totalPages,
    progressPercent: progress,
  });
});