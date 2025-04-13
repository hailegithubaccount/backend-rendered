
const utils = require("../utils/utils")
const userModel = require("../model/userModel"); // Import your user model
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For password comparison
require("dotenv").config(); 

// Configure storage as needed

const registerStudent = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Check if file was uploaded
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

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new student with image buffer
        const newUser = await userModel.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: "student",
            photo: {
                data: req.file.buffer,
                contentType: req.file.mimetype
            }
        });

        // Debug log to verify saved photo
        console.log('Saved student photo:', newUser.photo);

        // Generate JWT token
        const token = utils.signToken({ id: newUser.id, role: newUser.role });

        res.status(201).json({
            token,
            status: 'success',
            message: 'Student registered successfully',
            data: {
                ...newUser.toObject(),
                photoUrl: `${req.protocol}://${req.get('host')}/api/students/${newUser._id}/photo`
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
        // Verify admin role
        if (res.locals.role !== "admin") {
            return res.status(403).json({
                status: "failed",
                message: "Only admins can view students",
            });
        }

        // Fetch students excluding sensitive data
        const students = await userModel.find({ role: "student" })
            .select('-password -__v');

        // Add photoUrl to each student
        const studentsWithPhotoUrl = students.map(student => ({
            ...student.toObject(),
            photoUrl: `${req.protocol}://${req.get('host')}/api/students/${student._id}/photo`
        }));

        res.status(200).json({
            status: "success",
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
        const student = await userModel.findById(req.params.id);

        // Debug log to verify found student
        console.log('Found student:', student);

        if (!student || !student.photo || !student.photo.data) {
            return res.status(404).json({
                status: "failed",
                message: "Student or photo not found"
            });
        }

        // Set Content-Type header and send photo data
        res.set('Content-Type', student.photo.contentType);
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
      const deletedStudent = await userModel.findByIdAndDelete(studentID);

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