
const utils = require("../utils/utils")
const userModel = require("../model/userModel"); // Import your user model
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For password comparison
require("dotenv").config(); 




const registerStudent = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const photo = req.file ? req.file.filename : 'default.jpg';

    const newUser = await userModel.create({
      firstName,
      lastName,
      email,
      password,
      role: "student",
      photo
    });

    const token = utils.signToken({ id: newUser._id, role: newUser.role });

    res.status(201).json({
      token,
      status: 'success',
      data: {
        user: {
          ...newUser.toObject(),
          photoUrl: req.file 
            ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
            : null
        }
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};



const getAllStudents = async (req, res) => {
  try {
    if (res.locals.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Access denied: Admins only"
      });
    }

    const students = await userModel.find({ role: "student" });

    const processedStudents = students.map(student => ({
      ...student.toObject(),
      photoUrl: student.photo !== 'default.jpg'
        ? `${req.protocol}://${req.get('host')}/uploads/${student.photo}`
        : null
    }));

    res.status(200).json({
      status: "success",
      results: students.length,
      data: { students: processedStudents }
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch students"
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
    getAllStudents,
    deleteStudent,
   
  };