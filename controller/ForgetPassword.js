// const crypto = require('crypto');
// const nodemailer = require('nodemailer');

// // Forgot password endpoint
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
    
//     if (!email) {
//       return res.status(400).json({
//         status: 'fail',
//         message: 'Please provide an email address'
//       });
//     }

//     const user = await userModel.findOne({ email });
    
//     if (!user) {
//       return res.status(404).json({
//         status: 'fail',
//         message: 'No user found with that email address'
//       });
//     }

//     const resetToken = user.createPasswordResetToken();
//     await user.save({ validateBeforeSave: false });

//     // Send email with reset token
//     const resetURL = `https://yourapp.com/reset-password/${resetToken}`;
    
//     try {
//       const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//           user: process.env.EMAIL_USERNAME,
//           pass: process.env.EMAIL_PASSWORD
//         }
//       });

//       const mailOptions = {
//         from: 'Your App <no-reply@yourapp.com>',
//         to: user.email,
//         subject: 'Your password reset token (valid for 10 minutes)',
//         text: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`
//       };

//       await transporter.sendMail(mailOptions);

//       res.status(200).json({
//         status: 'success',
//         message: 'Token sent to email!'
//       });
//     } catch (err) {
//       user.passwordResetToken = undefined;
//       user.passwordResetExpired = undefined;
//       await user.save({ validateBeforeSave: false });

//       return res.status(500).json({
//         status: 'error',
//         message: 'There was an error sending the email. Try again later!'
//       });
//     }
//   } catch (error) {
//     console.error('Forgot password error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'An error occurred while processing your request'
//     });
//   }
// };

// // Reset password endpoint
// exports.resetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { password } = req.body;

//     if (!password) {
//       return res.status(400).json({
//         status: 'fail',
//         message: 'Please provide a new password'
//       });
//     }

//     const hashedToken = crypto
//       .createHash('sha256')
//       .update(token)
//       .digest('hex');

//     const user = await userModel.findOne({
//       passwordResetToken: hashedToken,
//       passwordResetExpired: { $gt: Date.now() }
//     });

//     if (!user) {
//       return res.status(400).json({
//         status: 'fail',
//         message: 'Token is invalid or has expired'
//       });
//     }

//     user.password = password;
//     user.passwordResetToken = undefined;
//     user.passwordResetExpired = undefined;
//     await user.save();

//     // Optionally log the user in automatically
//     const authToken = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWTSECRATE,
//       { expiresIn: process.env.EXPIRESIN }
//     );

//     res.status(200).json({
//       status: 'success',
//       message: 'Password updated successfully',
//       token: authToken
//     });
//   } catch (error) {
//     console.error('Reset password error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'An error occurred while resetting your password'
//     });
//   }
// };