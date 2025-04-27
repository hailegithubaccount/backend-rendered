const Chapter = require('../model/studyProgress/Chapter');
const Page = require('../model/studyProgress/Page');
const mongoose = require("mongoose");

// Create Chapter and Pages

const Student = require('../model/userModel'); // Make sure you have this model

// Create Chapter and Pages (Fixed Version)
exports.addChapter = async (req, res) => {
  try {
    const { title, totalPages } = req.body;
    const studentId = res.locals.id;

    // 1. Validate studentId exists and is valid
    if (!studentId) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required: No student ID found" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid student ID format" 
      });
    }

    // 2. Verify student exists in database
    const studentExists = await Student.exists({ _id: studentId });
    if (!studentExists) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    // 3. Create chapter with proper ObjectId reference
    const chapter = await Chapter.create({ 
      title, 
      totalPages, 
      student: new mongoose.Types.ObjectId(studentId) 
    });

    // 4. Create pages with proper references
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        chapter: chapter._id,
        student: new mongoose.Types.ObjectId(studentId),
        pageNumber: i,
        isRead: false // Explicitly set default
      });
    }

    await Page.insertMany(pages);

    // 5. Return success response with populated data
    const createdChapter = await Chapter.findById(chapter._id)
      .populate('student', 'name email'); // Adjust fields as needed

    res.status(201).json({
      success: true,
      message: "Chapter and pages created successfully",
      chapter: createdChapter,
      pagesCreated: pages.length
    });

  } catch (error) {
    console.error("Error in addChapter:", error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
};
// Get Pages by Chapter
exports.getChapterPages = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const pages = await Page.find({ chapter: chapterId }).sort('pageNumber');
    res.status(200).json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark Page as Read
exports.markPageRead = async (req, res) => {
  try {
    const { pageId } = req.body;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ success: false, message: "Page not found" });

    page.isRead = true;
    await page.save();

    res.status(200).json({ success: true, message: "Page marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Progress for a Chapter
exports.getProgress = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const totalPages = await Page.countDocuments({ chapter: chapterId });
    const completedPages = await Page.countDocuments({ chapter: chapterId, isRead: true });

    const progress = totalPages === 0 ? 0 : Math.round((completedPages / totalPages) * 100);

    res.status(200).json({
      success: true,
      completedPages,
      totalPages,
      progressPercent: progress,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
