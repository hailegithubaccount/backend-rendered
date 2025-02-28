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
      validate: [
        validator.isEmail,
        "Invalid email, please provide a valid email",
      ],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
      required: [true, "password is required"]
    },
    role: {
      type: String,
     
      enum:['student','admin',"library-staff"],
      default: "student",
    },
    passwordResetToken:String,
    passwordResetExpired:Date,
  },

  {
    timeStamps: true,
    id: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

//password hashing
userSchema.pre("save", async function (next) {
  // check if password is modified or not
  if (!this.isModified("password")) {
    return next();
  }
  this.password =await bcrypt.hash(this.password, 12);
  next()
});

//check the if user password and stored password is matched 
userSchema.methods.comparePassword = async function (
  inputPassowrd,
  password,
) {
  return await bcrypt.compare(inputPassowrd,password);
};

// userSchema.methods.createPasswordResetToken=async function () {
//   //generate random token
// //   const resetToken=crypto.randomBytes(32).toString('hex')
//   //hash that token
//   // this.passwordResetToken=crypto.createHash('sha256').update(resetToken).digest('hex')
//   // this.passwordResetExpired=Date.now() + 10 * 60 * 1000 //in mili sec

//   // console.log('reset token:',resetToken)
//   return resetToken;
// }

const userModel = mongoose.model("users", userSchema);

module.exports = userModel;