const Question = require("../../model/CommutiyHUbmodel/question");
const Answer = require("../../model/CommutiyHUbmodel/answer");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');

// @desc    Get all answers for a question
// @route   GET /api/community/questions/:questionId/answers
// @access  Public
// @desc    Get all answers for a question
// @route   GET /api/community/questions/:questionId/answers
// @access  Private (students only)
const getAnswersByQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  
  // Validate question ID
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid question ID"
    });
  }

  try {
    // Check if question exists
    const questionExists = await Question.exists({ _id: questionId });
    if (!questionExists) {
      return res.status(404).json({
        status: "failed",
        message: "Question not found"
      });
    }

    // Get answers with author information and vote counts
    const answers = await Answer.find({ question: questionId })
      .populate("author", "firstName lastName email")
      .lean(); // Convert to plain JavaScript object

    // Transform the data to include vote counts
    const transformedAnswers = answers.map(answer => ({
      ...answer,
      upvotes: answer.upvotes ? answer.upvotes.length : 0,
      downvotes: answer.downvotes ? answer.downvotes.length : 0,
      // Remove the upvotes and downvotes arrays if you don't want to expose who voted
      upvotes: undefined,
      downvotes: undefined
    }));

    res.status(200).json({
      status: "success",
      data: transformedAnswers
    });

  } catch (error) {
    console.error("Error fetching answers:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

// @desc    Create an answer
// @route   POST /api/community/questions/:questionId/answers
// @access  Private (students only)
const createAnswer = asyncHandler(async (req, res) => {
  // Authorization check is already handled by protect and checkRole middleware
  const { content } = req.body;
  const { questionId } = req.params;
  const authorId = res.locals.id;

  // Input validation
  if (!content?.trim()) {
    return res.status(400).json({
      status: "failed",
      message: "Answer content is required"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid question ID"
    });
  }

  // Check if question exists and is not solved
  const question = await Question.findById(questionId);
  if (!question) {
    return res.status(404).json({
      status: "failed",
      message: "Question not found"
    });
  }

  if (question.isSolved) {
    return res.status(403).json({
      status: "failed",
      message: "Cannot add answers to a solved question"
    });
  }

  // Check if user already answered this question
 

  // Create answer in transaction to ensure data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const answer = await Answer.create([{
      content: content.trim(),
      question: questionId,
      author: authorId,
      upvotes: [],
      downvotes: []
    }], { session });

    await Question.findByIdAndUpdate(
      questionId,
      { $push: { answers: answer[0]._id } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Populate author info for response
    const populatedAnswer = await Answer.findById(answer[0]._id)
      .populate("author", "firstName lastName email");

    res.status(201).json({
      status: "success",
      data: {
        ...populatedAnswer.toObject(),
        upvotes: 0,
        downvotes: 0
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error("Answer creation error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});
// @desc    Update an answer
// @route   PATCH /api/community/answers/:id
// @access  Private (answer author or admin)
// const updateAnswer = asyncHandler(async (req, res) => {
//   if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//     return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
//   }

//   const answer = await Answer.findById(req.params.id);

//   if (!answer) {
//     return res.status(404).json({ status: "failed", message: "Answer not found" });
//   }

//   // Check if user is the author or admin
//   if (answer.author.toString() !== res.locals.id && res.locals.role !== "admin") {
//     return res.status(403).json({ 
//       status: "failed", 
//       message: "Not authorized to update this answer" 
//     });
//   }

//   const updatedAnswer = await Answer.findByIdAndUpdate(
//     req.params.id,
//     req.body,
//     { new: true, runValidators: true }
//   );

//   res.status(200).json({
//     status: "success",
//     data: updatedAnswer
//   });
// });

// @desc    Delete an answer
// @route   DELETE /api/community/answers/:id
// @access  Private (answer author or admin)
const deleteAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  // Check if user is the author or admin
  if (answer.author.toString() !== res.locals.userId && res.locals.role !== "admin") {
    return res.status(403).json({ 
      status: "failed", 
      message: "Not authorized to delete this answer" 
    });
  }

  // Remove answer from question's answers array
  await Question.findByIdAndUpdate(answer.question, {
    $pull: { answers: answer._id }
  });

  await answer.deleteOne();

  res.status(204).json({
    status: "success",
    data: null
  });
});

// @desc    Accept an answer
// @route   PATCH /api/community/answers/:id/accept
// @access  Private (question author only)
const acceptAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  const question = await Question.findById(answer.question);

  // Check if user is the question author
  if (question.author.toString() !== res.locals.userId) {
    return res.status(403).json({ 
      status: "failed", 
      message: "Only the question author can accept an answer" 
    });
  }

  // Unaccept any previously accepted answer for this question
  await Answer.updateMany(
    { question: answer.question, _id: { $ne: answer._id } },
    { isAccepted: false }
  );

  // Accept this answer
  answer.isAccepted = true;
  await answer.save();

  // Mark question as solved
  question.solved = true;
  question.acceptedAnswer = answer._id;
  await question.save();

  res.status(200).json({
    status: "success",
    data: answer
  });
});

// @desc    Upvote an answer
// @route   POST /api/community/answers/:id/upvote
// @access  Private
const upvoteAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  // Check if user already upvoted
  if (answer.upvotes.includes(res.locals.userId)) {
    return res.status(400).json({ 
      status: "failed", 
      message: "You have already upvoted this answer" 
    });
  }

  // Remove from downvotes if exists
  if (answer.downvotes.includes(res.locals.userId)) {
    answer.downvotes = answer.downvotes.filter(
      id => id.toString() !== res.locals.userId
    );
  }

  answer.upvotes.push(res.locals.userId);
  await answer.save();

  res.status(200).json({
    status: "success",
    data: answer
  });
});

// @desc    Downvote an answer
// @route   POST /api/community/answers/:id/downvote
// @access  Private
const downvoteAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  // Check if user already downvoted
  if (answer.downvotes.includes(res.locals.userId)) {
    return res.status(400).json({ 
      status: "failed", 
      message: "You have already downvoted this answer" 
    });
  }

  // Remove from upvotes if exists
  if (answer.upvotes.includes(res.locals.userId)) {
    answer.upvotes = answer.upvotes.filter(
      id => id.toString() !== res.locals.userId
    );
  }

  answer.downvotes.push(res.locals.userId);
  await answer.save();

  res.status(200).json({
    status: "success",
    data: answer
  });
});





 module.exports = {
   
    downvoteAnswer,
    upvoteAnswer,
    acceptAnswer ,
    deleteAnswer,
  
    getAnswersByQuestion,
    createAnswer

    

    

    
  };