const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/photos/"); // Destination folder for photo uploads
  },
  filename: function (req, file, cb) {
    // Preserve the original file extension
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // File naming with extension
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 9000000 }, // Limit file size to 9MB
  fileFilter: function (req, file, cb) {
    // Allow only images for now
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Images Only!"));
    }
  },
}).single("photo"); // Handle only the "photo" field

module.exports = upload;