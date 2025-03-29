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

const wishlistRoutes=require("./routes/WishlistRoute");
const notfy=require("./routes/notficationtostud")
const seatNotfy = require("./routes/notificationSeatRoute")
// for aother app notifcation 
const real=require("./routes/routeM")


const announcementRoute=require("./routes/announcementRoutes")


const IndependatSeatResevationRoutes=require("./routes/IndependatSeatResevationRoutes")


const bookSeatRoutes=require("./routes/bookSeatRoute");

// Use Routes
app.use('/api/users', studentRoute);
app.use('/api/users', userRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/books', bookRoutes); 
app.use('/api/seats', seatRoutes); 
app.use('/api/now', nowRoutes);  
app.use('/api/requests', requestBook);
app.use('/api/notfiystudent',notfy);
app.use('/api/the',wishlistRoutes);
app.use('/api/notfiyseat',seatNotfy);
app.use('/api/Announc',announcementRoute);


// indepedate resevation seat routes
app.use('/api/indepenadteSeat',IndependatSeatResevationRoutes);

// Books seat routes

app.use('/api/BookSeat',bookSeatRoutes);




//for trying the real message in the abother application code

app.use('/api/realN',real);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
