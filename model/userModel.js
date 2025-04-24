const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      maxlength: [30, "First name cannot exceed 30 characters"],
      minlength: [3, "First name must be at least 3 characters"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      maxlength: [30, "Last name cannot exceed 30 characters"],
      minlength: [3, "Last name must be at least 3 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      validate: [validator.isEmail, "Invalid email, please provide a valid email"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
      required: [true, "password is required"]
    },
    photo: {
      data: Buffer,
      contentType: String
    },
    loginCount: {
      type: Number,
      default: 0
    },
    lastLogin: {
      type: Date
    },
    studyProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    role: {
      type: String,
      enum: ['student', 'admin', "library-staff"],
      default: "student",
    },
    passwordResetToken: String,
    passwordResetExpired: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
      },
    },
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("users", userSchema);