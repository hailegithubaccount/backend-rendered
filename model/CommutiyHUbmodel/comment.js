const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      maxlength: [500, "Comment cannot exceed 500 characters"],
      minlength: [5, "Comment must be at least 5 characters"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "questions",
    },
    answer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "answers",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Validate that comment is either for a question or answer but not both
commentSchema.pre("save", function(next) {
  if (!this.question && !this.answer) {
    throw new Error("Comment must be associated with either a question or answer");
  }
  if (this.question && this.answer) {
    throw new Error("Comment cannot be associated with both a question and answer");
  }
  next();
});

const Comment = mongoose.model("comments", commentSchema);

module.exports = Comment;