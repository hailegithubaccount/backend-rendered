const Chapter = require('../model/studyProgress/Chapter');
const Page = require('../model/studyProgress/Page');
const Student = require('../model/userModel'); // Assuming you have a Student model
const mongoose = require("mongoose");

// Create Chapter and Pages
exports.addChapter = async (req, res) => {
  try {
    const { title, totalPages } = req.body;
    const studentId = res.locals.id; // Assuming you have authentication middleware

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Create chapter with student reference
    const chapter = await Chapter.create({ 
      title, 
      totalPages, 
      student: mongoose.Types.ObjectId(studentId) 
    });

    // Create pages with proper references
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({ 
        chapter: mongoose.Types.ObjectId(chapter._id), 
        student: mongoose.Types.ObjectId(studentId),
        pageNumber: i 
      });
    }
    
    await Page.insertMany(pages);

    res.status(201).json({ 
      success: true, 
      message: "Chapter and pages created", 
      chapter,
      student: {
        id: student._id,
        name: student.name // assuming your Student model has a name field
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Pages by Chapter (with student verification)
exports.getChapterPages = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const studentId = res.locals.id;

    // Verify the chapter belongs to the student
    const chapter = await Chapter.findOne({ 
      _id: chapterId, 
      student: studentId 
    });
    
    if (!chapter) {
      return res.status(404).json({ 
        success: false, 
        message: "Chapter not found or doesn't belong to this student" 
      });
    }

    const pages = await Page.find({ 
      chapter: chapterId,
      student: studentId 
    }).sort('pageNumber');
    
    res.status(200).json({ 
      success: true, 
      pages,
      chapterTitle: chapter.title 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark Page as Read (with student verification)
exports.markPageRead = async (req, res) => {
  try {
    const { pageId } = req.body;
    const studentId = res.locals.id;

    const page = await Page.findOne({
      _id: pageId,
      student: studentId
    });
    
    if (!page) {
      return res.status(404).json({ 
        success: false, 
        message: "Page not found or doesn't belong to this student" 
      });
    }

    page.isRead = true;
    await page.save();

    res.status(200).json({ 
      success: true, 
      message: "Page marked as read",
      pageNumber: page.pageNumber,
      chapterId: page.chapter
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Progress for a Chapter (with student verification)
exports.getProgress = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const studentId = res.locals.id;

    // Verify chapter belongs to student
    const chapter = await Chapter.findOne({
      _id: chapterId,
      student: studentId
    });
    
    if (!chapter) {
      return res.status(404).json({ 
        success: false, 
        message: "Chapter not found or doesn't belong to this student" 
      });
    }

    const totalPages = await Page.countDocuments({ 
      chapter: chapterId,
      student: studentId
    });
    
    const completedPages = await Page.countDocuments({ 
      chapter: chapterId, 
      student: studentId,
      isRead: true 
    });

    const progress = totalPages === 0 ? 0 : Math.round((completedPages / totalPages) * 100);

    res.status(200).json({
      success: true,
      completedPages,
      totalPages,
      progressPercent: progress,
      chapterTitle: chapter.title
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};