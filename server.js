const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();
const cookieParser = require("cookie-parser"); 
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Connect to Database
connectDB();

// Import Routes
const userRoutes = require('./routes/userRoute');
const adminRoutes = require('./routes/adminRoute');
const bookRoutes = require('./routes/bookRoute');
const seatRoutes = require('./routes/seatRoute');
const nowRoutes = require("./routes/nowRoute");
const studentRoute = require("./routes/StudentRoute");
const requestBook = require("./routes/requestRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Use Routes
app.use('/api/users', studentRoute);
app.use('/api/users', userRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/books', bookRoutes); 
app.use('/api/seats', seatRoutes); 
app.use('/api/now', nowRoutes);  
app.use('/api/requests', requestBook);
app.use('/api/notifications', notificationRoutes);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
