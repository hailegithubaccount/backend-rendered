const jwt = require("jsonwebtoken")
const userModel = require("../model/userModel")
require("dotenv").config()





exports.protect = async (req, res, next) => {
    try {
        let token;

        // Check if token is provided in the Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check if token is provided in cookies
        else if (req.cookies.token) {
            token = req.cookies.token;
        }

        // If no token is found
        if (!token) {
            return res.status(401).json({
                status: 'failed',
                message: 'No authentication token provided.'
            });
        }

        // Verify the token
        const verified = jwt.verify(token, process.env.JWTSECRATE);

        // Attach user ID and role to res.locals
        res.locals.id = verified.id; // Ensure this matches the payload structure
        res.locals.role = verified.role; // Ensure this matches the payload structure

        next();
    } catch (error) {
        console.error("Error in protect middleware:", error);

        // Send error response
        res.status(401).json({
            status: 'failed',
            message: 'Invalid or expired token.'
        });
    }
};

// Middleware to check if the user has a specific role
exports.checkRole = (role) => {
    return (req, res, next) => {
        if (res.locals.role !== role) {
            return res.status(403).json({
                status: 'failed',
                message: `You do not have permission to access this resource. Required role: ${role}.`
            });
        }
        next();
    };
};

// Middleware to check if the user exists in the database
exports.checkUserExists = async (req, res, next) => {
    try {
        const user = await userModel.findById(res.locals.id);

        if (!user) {
            return res.status(404).json({
                status: 'failed',
                message: 'User does not exist.'
            });
        }

        // Attach the user to res.locals for use in subsequent middlewares
        res.locals.user = user;

        next();
    } catch (error) {
        console.error("Error in checkUserExists middleware:", error);

        res.status(500).json({
            status: 'failed',
            message: 'An error occurred while checking the user.'
        });
    }
};























































// exports.protect = async (req, res, next) => {
//     try {
//         let token;
//         if (req.headers.authorization &&
//             req.headers.authorization.startsWith('Bearer')) {
//             token = req.headers.authorization.split(' ')[1];
//         } else {
//             return res.status(400).json({
//                 status: 'failed',
//                 message: 'No authentication token is provided'
//             });
//         }

//         const verified = await jwt.verify(token, process.env.JWTSECRATE);
//         console.log(verified);

//         res.locals.id = verified.id.id;
//         res.locals.role = verified.id.role;

//         next();
//     } catch (error) {
//         console.error(error);
//         if (!res.headersSent) {
//             res.status(400).json({
//                 status: 'failed',
//                 message: error.message
//             });
//         }
//     }
// };

// exports.isAdmin =async(req,res,next)=>{
//   const id= res.locals.id  
//   const user=await userModel.findById(id)

//   if(!user){
//     return (
//         res.status(400).json({
//             status:'failed',
//             message:'user does not exist longer'
//         })
//     )
// }

// if(user && user.role !== 'admin'){
//     return (
//         res.status(401).json({
//             status:'failed',
//             message:'you dont have a permission to do that'
//         })
//     )
// }

// res.locals.admin=user

// next()
// }

// exports.isUser =async(req,res,next)=>{
//     const id= res.locals.id  
//     const user=await userModel.findById(id)
  
//     if(!user){
//       return (
//           res.status(400).json({
//               status:'failed',
//               message:'user does not exist longer'
//           })
//       )
//   }
  
//   if(user && user.role !== 'user'){
//       return (
//           res.status(401).json({
//               status:'failed',
//               message:'you dont have a permission to do that'
//           })
//       )
//   }
  
//   res.locals.user=user
  
//   next()
//   }