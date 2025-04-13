
const utils = require("../utils/utils")
const User= require("../model/userModel"); // Import your user model
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For password comparison
require("dotenv").config(); 

// Configure storage as needed



const registerStudent = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // Check if photo was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile photo is required'
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        status: 'error',
        message: 'Only JPEG, PNG, and GIF images are allowed'
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        status: 'error',
        message: 'Image size exceeds 5MB limit'
      });
    }

    // Create new student
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: "student",
      photo: {
        data: req.file.buffer,
        contentType: req.file.mimetype
      }
    });

    // Generate photo URL
    const photoUrl = `${req.protocol}://${req.get('host')}/api/students/${newUser.id}/photo`;

    res.status(201).json({
      status: 'success',
      message: 'Student registered successfully',
      data: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        photoUrl
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists'
      });
    }
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getAllStudents = async (req, res) => {
  try {
    // Fetch students with only necessary fields
    const students = await User.find({ role: "student" })
      .select('firstName lastName email role photo');

    // Add photoUrl to each student
    const studentsWithPhotoUrl = students.map(student => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      role: student.role,
      photoUrl: `${req.protocol}://${req.get('host')}/api/students/${student.id}/photo`
    }));

    res.status(200).json({
      status: "success",
      results: students.length,
      data: studentsWithPhotoUrl
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const getStudentPhoto = async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        status: "error", 
        message: "Invalid student ID format" 
      });
    }

    // Find student with only photo data
    const student = await User.findById(req.params.id)
      .select('photo -_id');

    if (!student?.photo?.data) {
      return res.status(404).json({ 
        status: "error", 
        message: "Photo not found for this student" 
      });
    }

    // Set headers and send image
    res.set({
      'Content-Type': student.photo.contentType,
      'Content-Length': student.photo.data.length,
      'Cache-Control': 'public, max-age=86400' // Cache for 1 day
    });
    
    return res.send(student.photo.data);
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};



const deleteStudent = async (req, res, next) => {
  try {
      if (res.locals.role !== "admin") {
          return res.status(403).json({
              status: "failed",
              message: "Only admins can delete students",
          });
      }

      const studentID = req.params.id;
      const deletedStudent = await User.findByIdAndDelete(studentID);

      if (!deletedStudent) {
          return res.status(404).json({
              status: "failed",
              message: "Student not found",
          });
      }

      res.status(200).json({
          status: "success",
          message: "Student deleted successfully",
          deletedStudent,
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
    getAllStudents,
    deleteStudent,
    getStudentPhoto,
   
  };