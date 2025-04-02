const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      maxlength: [150, "Title cannot exceed 150 characters"],
      minlength: [10, "Title must be at least 10 characters"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: [20, "Content must be at least 20 characters"],
    },
    tags: {
      type: [String],
      required: [true, "At least one tag is required"],
      validate: {
        validator: function(tags) {
          return tags.length <= 5;
        },
        message: "Cannot add more than 5 tags"
      }
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    }],
    views: {
      type: Number,
      default: 0,
    },
    isSolved: {
      type: Boolean,
      default: false,
    },
    answers: {
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

// Cascade delete answers when question is deleted
questionSchema.pre("remove", async function(next) {
  await this.model("answers").deleteMany({ question: this._id });
  next();
});

const Question = mongoose.model("questions", questionSchema);

module.exports = Question;