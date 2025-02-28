const jwt = require("jsonwebtoken")
require("dotenv").config()

exports.signToken=(id,role)=>{
const payload = {id,role}

return jwt.sign(payload,process.env.JWTSECRATE,{expiresIn:process.env.EXPIRESIN})

}