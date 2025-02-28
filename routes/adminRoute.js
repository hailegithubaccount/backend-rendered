const express = require("express");
const router = express.Router();
const staffController = require("../controller/staffController")
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 

// Route to register a new library staff member
router.post(
  "/admin/register-staff",protect,checkRole("admin"), checkUserExists,staffController.registerLibraryStaff);

// Route to update an existing library staff member (using staff id as a parameter)
router.put("/admin/update-staff/:id",protect,checkRole("admin"), checkUserExists,staffController.updateLibraryStaff
);

// Route to delete a library staff member (using staff id as a parameter)
router.delete(
  "/admin/delete-staff/:id",protect,checkRole("admin"), checkUserExists,staffController.deleteLibraryStaff
);

// Route to fetch all library staff
router.get(
  "/admin/library-staff",protect,checkRole("admin"), checkUserExists,staffController.getAllLibraryStaff);

module.exports = router;
