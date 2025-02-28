const userModel = require("../model/userModel")
const utils = require("../utils/utils")

// Register a new library staff member
exports.registerLibraryStaff=async (req,res,next)=>{
    try {
        // firstname ,lastname ,email,password from req.body
        const {firstName ,lastName ,email,password} =req.body
        // creaNeuser
       
        const newUser = await userModel.create({
                        firstName,
                        lastName,
                        email,
                        password,
                        role: "library-staff",  // Default role for staff
                    });
        // create token
        const token = utils.signToken({id:newUser.id,role:newUser.role})
        // send response
        
        res.status(201).json({
            token,
            status:'succes',
            message:'user register successfully',
            newUser
        })
     
    } catch (error) {
        console.log(error)
    }
}
// Update an existing library staff member
exports.updateLibraryStaff = async (req, res, next) => {
  try {
    if (res.locals.role !== "admin") {
      return res.status(403).json({
        status: "failed",
        message: "Only admins can update library staff",
      });
    }

    const staffId = req.params.id;
    const updateData = req.body;

    const updatedStaff = await userModel.findByIdAndUpdate(staffId, updateData, {
      new: true,
    });

    if (!updatedStaff) {
      return res.status(404).json({
        status: "failed",
        message: "Library staff not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Library staff updated successfully",
      updatedStaff,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "failed",
      message: "Server error, unable to update staff",
    });
  }
};

// Delete a library staff member
exports.deleteLibraryStaff = async (req, res, next) => {
  try {
    if (res.locals.role !== "admin") {
      return res.status(403).json({
        status: "failed",
        message: "Only admins can delete library staff",
      });
    }

    const staffId = req.params.id;
    const deletedStaff = await userModel.findByIdAndDelete(staffId);

    if (!deletedStaff) {
      return res.status(404).json({
        status: "failed",
        message: "Library staff not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Library staff deleted successfully",
      deletedStaff,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "failed",
      message: "Server error, unable to delete staff",
    });
  }
};

// Fetch all library staff
exports.getAllLibraryStaff = async (req, res, next) => {
  try {
    if (res.locals.role !== "admin") {
      return res.status(403).json({
        status: "failed",
        message: "Only admins can view library staff",
      });
    }

    const staffList = await userModel.find({ role: "library-staff" });
    res.status(200).json({
      status: "success",
      message: "Library staff fetched successfully",
      staff: staffList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "failed",
      message: "Server error, unable to fetch library staff",
    });
  }
};
