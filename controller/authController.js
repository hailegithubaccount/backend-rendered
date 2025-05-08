
const utils = require("../utils/utils")
const userModel = require("../model/userModel"); // Import your user model
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For password comparison
require("dotenv").config(); 
const Email = require('../utils/email');


// exports.register=async (req,res,next)=>{
//     try {
//         // firstname ,lastname ,email,password from req.body
//         const {firstName ,lastName ,email,password,role} =req.body
//         // creaNe user
//         const newUser = await userModel.create({
//             firstName ,lastName ,email,password,role
//         })
//         // create token
//         const token = utils.signToken({id:newUser.id,role:newUser.role})
//         // send response
        
//         res.status(201).json({
//             token,
//             status:'succes',
//             message:'user register successfully',
//             newUser
//         })
     
//     } catch (error) {
//         console.log(error)
//     }
// }


// exports.registerLibraryStaff = async (req, res, next) => {
//     try {
//         // Check if the user is an admin
//         if (res.locals.role !== "admin") {
//             return res.status(403).json({
//                 status: "failed",
//                 message: "Only admins can register library staff",
//             });
//         }

//         // Extract staff details from the request
//         const { firstName, lastName, email, password } = req.body;

//         // Create a new user with role "library-staff"
//         const newStaff = await userModel.create({
//             firstName,
//             lastName,
//             email,
//             password,
//             role: "library-staff",  // Default role for staff
//         });

//         // Send response
//         res.status(201).json({
//             status: "success",
//             message: "Library staff registered successfully",
//             newStaff,
//         });

//     } catch (error) {
//         console.log(error);
//         res.status(500).json({
//             status: "failed",
//             message: "Server error, unable to register staff",
//         });
 // Ensure you import your utils

//  exports.registerAdmin = async (req, res, next) => {
//   try {
//     // Check if an admin already exists
//     const existingAdmin = await userModel.findOne({ role: "admin" });
    
//     if (existingAdmin) {
//       return res.status(400).json({
//         status: "fail",
//         message: "Super admin already exists. Cannot register another admin.",
//       });
//     }

//     // Extract admin details from request
//     const { firstName, lastName, email, password } = req.body;

//     // Create a new admin user
//     const newAdmin = await userModel.create({
//       firstName,
//       lastName,
//       email,
//       password,
//       role: "admin",  // Super admin role
//     });

//     // Generate JWT token for the admin
//     const token = jwt.sign(
//       { id: newAdmin._id, role: newAdmin.role, email: newAdmin.email },
//       process.env.JWTSECRATE,
//       { expiresIn: process.env.EXPIRESIN }
//     );

//     // Send the response
//     res.status(201).json({
//       token,
//       status: "success",
//       message: "Super admin registered successfully.",
//       newAdmin,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       status: "error",
//       message: "An error occurred during admin registration.",
//     });
//   }
// };





exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide boooth email and password.",
      });
    }

    // 2. Find the user by email and include the password field
    const user = await userModel.findOne({ email }).select("+password");

    // 3. Check if the user exists
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    // 4. Compare the provided password with the hashed password in the database
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(400).json({
        status: "fail",
        message: "Incorrect password. Please try again.",
      });
    }

    // Update login count and study progress (only for students)
    if (user.role === 'student') {
      user.loginCount += 1;
      user.lastLogin = new Date();

      // Add the login activity entry
      user.loginActivity.push({
        date: new Date(),
        sessionDuration: 0, // Default session duration (can be updated later)
      });

      // Calculate study progress based on login count
      user.studyProgress = Math.min(100, user.loginCount);

      await user.save();
    }

    // 5. Generate a JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role,email: user.email, },
      process.env.JWTSECRATE,
      { expiresIn: process.env.EXPIRESIN }
    );

    // 6. Set the token in an httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      domain: "localhost",
      path: "/",
    });

    // 7. Send the response
    res.status(200).json({
      token,
      role: user.role,
      status: "success",
      message: "User logged in successfully.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        loginCount: user.loginCount,
        studyProgress: user.studyProgress,
        loginActivity:user.loginActivity,
        department:user.department,
        studentId:user.studentId,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during login.",
    });
  }
};






// @desc    Request password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgetPassword =async (req, res) => {
  const { email } = req.body;
  
  // Get the user by using the provided email
  const user = await userModel.findOne({ email });
  
  if (!user) {
    res.status(404);
    throw new Error('No user found with that email address.');
  }

  // Generate a random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOtp = otp;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  // Send OTP via email
  await Email(user.email, otp);
  
  res.status(200).json({
    status: "success",
    message: "OTP sent to email!",
  });
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
exports.otpVerification = async (req, res) => {
  const { email, otp } = req.body;

  const user = await userModel.findOne({ email });

  if (!user || user.passwordResetOtp !== otp || user.passwordResetExpires < Date.now()) {
    res.status(400);
    throw new Error('Invalid or expired OTP. Please request a new OTP.');
  }

  res.status(200).json({
    success: true,
    message: "OTP verified successfully.",
  });
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  const { email, otp, password, passwordConfirm } = req.body;

  const user = await userModel.findOne({ email });
  
  if (!user || user.passwordResetOtp !== otp) {
    res.status(400);
    throw new Error('Invalid or expired OTP. Please request a new OTP.');
  }

  // Update user's password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password reset successfully.",
  });
};

// @desc    Update password (for logged in users)
// @route   PUT /api/auth/update-password
// @access  Private
//dd
const bcrypt = require('bcryptjs');
const validator = require('validator');
const userModel = require('../models/userModel');

exports.updatePassword = async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword, passwordConfirm } = req.body;

    // 1. Validate all fields
    if (!email || !currentPassword || !newPassword || !passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'All fields are required'
      });
    }

    // 2. Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid email address'
      });
    }

    // 3. Check password strength
    if (!validator.isStrongPassword(newPassword, { 
      minLength: 8, 
      minLowercase: 1, 
      minUppercase: 1, 
      minNumbers: 1, 
      minSymbols: 1 
    })) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol'
      });
    }

    // 4. Check if passwords match
    if (newPassword !== passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'Passwords do not match'
      });
    }

    // 5. Get user with password
    const user = await userModel.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // 6. Verify current password
    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) {
      return res.status(401).json({
        status: 'fail',
        message: 'Current password is incorrect'
      });
    }

    // 7. Check if new password is same as current
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        status: 'fail',
        message: 'New password cannot be the same as current password'
      });
    }

    // 8. Check password history (if implemented)
    // This would require storing previous passwords in your user model
    // if (user.passwordHistory.includes(await bcrypt.hash(newPassword, 12))) {
    //   return res.status(400).json({
    //     status: 'fail',
    //     message: 'Password was used recently. Please choose a different one.'
    //   });
    // }

    // 9. Update password
    user.password = newPassword;
    user.passwordConfirm = passwordConfirm;
    user.passwordChangedAt = Date.now();
    await user.save();

    // 10. Remove sensitive data from response
    user.password = undefined;
    user.passwordConfirm = undefined;

    // 11. Send success response
    res.status(200).json({
      status: "success",
      message: "Password updated successfully"
    });

  } catch (err) {
    // 12. Handle errors
    console.error('Password update error:', err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating password'
    });
  }
};








exports.getAllUser= async(req,res,next)=>{
    console.log(res.locals.id)
    const users = await userModel.find()

    //send response
    return (
        res.status(200).json({
            status:'success',
            users
        })
    )
}