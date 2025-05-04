const jwt = require("jsonwebtoken")
require("dotenv").config()

exports.signToken=(id,role,email)=>{
const payload = {id,role,email}

return jwt.sign(payload,process.env.JWTSECRATE,{expiresIn:process.env.EXPIRESIN})

}