
const utils = require("../utils/utils")
const userModel = require("../model/userModel"); // Import your user model
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For password comparison
require("dotenv").config(); 

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure storage as needed

const registerStudent = async (req, res, next) => {
    try {
        // Handle file upload if exists
        const photo = req.file ? req.file.path : 'default.jpg';
        
        const { firstName, lastName, email, password } = req.body;
        
        const newUser = await userModel.create({
            firstName,
            lastName,
            email,
            password,
            role: "student",
            photo
        });

        const token = utils.signToken({ id: newUser.id, role: newUser.role });
        
        res.status(201).json({
            token,
            status: 'success',
            message: 'student register successfully',
            newUser
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// In your routes file:


const getAllStudent = async (req, res, next) => {
    try {
      if (res.locals.role !== "admin") {
        return res.status(403).json({
          status: "failed",
          message: "Only admins can view students",
        });
      }
  
      const studentList = await userModel.find({ role: "student" });
      res.status(200).json({
        status: "success",
        message: "student fetched successfully",
        staff: studentList,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: "failed",
        message: "Server error, unable to fetch library staff",
      });
    }
  };
  const deleteStudent = async (req, res, next) => {
    try {
      if (res.locals.role !== "admin") {
        return res.status(403).json({
          status: "failed",
          message: "Only admins can delete library staff",
        });
      }
  
      const studentID = req.params.id;
      const deletedstudent = await userModel.findByIdAndDelete(studentID);
  
      if (!deletedstudent) {
        return res.status(404).json({
          status: "failed",
          message: "student not found",
        });
      }
  
      res.status(200).json({
        status: "success",
        message: "student deleted successfully",
        deletedstudent,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: "failed",
        message: "Server error, unable to delete student",
      });
    }
  };




module.exports = {
    registerStudent,
    getAllStudent,
    deleteStudent,
   
  };