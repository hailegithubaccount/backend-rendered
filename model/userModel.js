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
    passwordResetExpires: Date,
    passwordResetOtp: String,

    department: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.role === "student") return v && v.length > 0;
          return true;
        },
        message: "Department is required for students",
      },
    },
    isActive: {
      type: Boolean,
      default: true
  },
    studentId: {
      type: String,
      unique: true,
      sparse: true, // important to allow multiple nulls
      validate: {
        validator: function (v) {
          if (this.role !== "student") return true;
          return /^[A-Z]{2}\d{4}\/\d{2}$/.test(v);
        },
        message: "Student ID must be in the format RU2089/19 (required for students)",
      },
    },

    // Add this field for login activity
    loginActivity: [
      {
        date: {
          type: Date, // Store the date of each login
          default: Date.now,
        },
        sessionDuration: {
          type: Number, // Optional: Store session duration in seconds
          default: 0,
        },
      },
    ],
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

// Add to userSchema.methods
////ddddddddddddddddddd



module.exports = mongoose.model("users", userSchema);