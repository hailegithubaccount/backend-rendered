
const utils = require("../utils/utils")
const userModel = require("../model/userModel"); // Import your user model
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For password comparison
require("dotenv").config(); 

// Configure storage as needed

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
      // Check if the user is an admin
      if (res.locals.role !== "admin") {
          return res.status(403).json({
              status: "failed",
              message: "Only admins can view students",
          });
      }

      // Fetch all students from the database
      const studentList = await userModel.find({ role: "student" });

      // Construct the full photo URL for each student
      const studentsWithPhotoUrl = studentList.map(student => ({
          ...student.toObject(),
          photoUrl: student.photo ? `${req.protocol}://${req.get('host')}/${student.photo}` : null
      }));

      // Send success response
      res.status(200).json({
          status: "success",
          message: "Students fetched successfully",
          students: studentsWithPhotoUrl,
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({
          status: "failed",
          message: "Server error, unable to fetch students",
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