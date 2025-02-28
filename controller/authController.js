
const utils = require("../utils/utils")
const userModel = require("../model/userModel"); // Import your user model
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For password comparison
require("dotenv").config(); 
// exports.register=async (req,res,next)=>{
//     try {
//         // firstname ,lastname ,email,password from req.body
//         const {firstName ,lastName ,email,password} =req.body
//         // creaNe user
//         const newUser = await userModel.create({
//             firstName ,lastName ,email,password
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

 exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                status: "fail",
                message: "Please provide both email and password.",
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
        const isPasswordValid = await user.comparePassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({
                status: "fail",
                message: "Incorrect password. Please try again.",
            });
        }

        // 5. Generate a JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role }, // Payload
            process.env.JWTSECRATE, // Secret key from environment variables
            { expiresIn: process.env.EXPIRESIN } // Token expiry time
        );

        // 6. Set the token in an httpOnly cookie
        res.cookie("token", token, {
            httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
            secure: process.env.NODE_ENV === "production", // Use HTTPS in production
            sameSite: "lax", // Use "lax" for better cross-browser compatibility
            maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
            domain: "localhost", // Set the domain explicitly for local testing
            path: "/", // Set the path to root
        });

        // 7. Send the response (without the token in the body for security)
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
                password:user.password,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Error in login:", error);

        // Send a generic error response
        res.status(500).json({
            status: "error",
            message: "An error occurred during login.",
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