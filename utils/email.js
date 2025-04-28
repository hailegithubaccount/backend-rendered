const jwt = require("jsonwebtoken")
require("dotenv").config()
const nodemailer = require("nodemailer");

// Email function to send the password reset email
const Email = async (userEmail, otp) => {
  console.log("Preparing to send email to:", userEmail);
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from:process.env.EMAIL,
      to: userEmail,
      subject: "Password Reset",
      text: `Your password reset otp is|  ${otp}  |. If you did not request this, please ignore it. `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", userEmail);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = Email;
