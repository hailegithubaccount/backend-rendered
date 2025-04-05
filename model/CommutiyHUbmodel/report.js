const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    entityType: {
      type: String,
      enum: ["question", "answer"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "entityType", // Dynamically reference the model based on entityType
    },
    content: {
      type: String,
      required: [true, "Content of the reported entity is required"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    reason: {
      type: String,
      required: [true, "Reason for the report is required"],
      minlength: [10, "Reason must be at least 10 characters"],
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    resolvedAt: {
      type: Date,
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

// Create and export the model
const Report = mongoose.model("Reports", reportSchema);
module.exports = Report;