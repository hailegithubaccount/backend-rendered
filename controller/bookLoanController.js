const Message = require("../model/BookLoan"); // Or rename it to Message.js
const User = require("../model/userModel");
const mongoose = require("mongoose");

// Send a message to a student
// Send a message to a student
// Send a message to a student
exports.sendMessage = async (req, res) => {
  try {
    const { email, studentId, text, sender = "library-staff", returnTime } = req.body;

    // Validate input
    if (!email || !studentId || !text) {
      return res.status(400).json({ message: "Email, studentId, and text are required" });
    }

    // Trim and lowercase email for consistency
    const normalizedEmail = email.trim().toLowerCase();
    
    const user = await User.findOne({ 
      email: normalizedEmail, 
      studentId,
      role: "student" 
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found or not a student account" 
      });
    }

    const messageData = {
      recipient: user._id,
      recipientEmail: normalizedEmail, // Use normalized email
      recipientStudentId: studentId,
      text,
      sender,
      displayAfter: new Date(Date.now() + 3 * 60 * 1000) // 3 minutes delay
    };

    if (returnTime) {
      messageData.returnTime = new Date(returnTime);
      if (messageData.returnTime <= new Date()) {
        return res.status(400).json({ 
          success: false,
          message: "Return time must be in the future" 
        });
      }
    }

    const message = await Message.create(messageData);
    console.log('Message created:', message); // Log for debugging

    res.status(201).json({ 
      success: true,
      message: "Message sent successfully (will be visible after 3 minutes)", 
      data: message 
    });
  } catch (error) {
    console.error('Error sending message:', error); // Detailed error logging
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: "Validation error",
        error: error.message 
      });
    }
    res.status(500).json({ 
      success: false,
      message: "Failed to send message", 
      error: error.message 
    });
  }
};

// Get all messages for a specific student
exports.getMessagesForStudent = async (req, res) => {
  try {
    const studentEmail = res.locals.email?.trim()?.toLowerCase(); // Normalize email

    if (!studentEmail) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: email not found."
      });
    }

    const now = new Date();
    console.log(`Fetching messages for ${studentEmail} at ${now}`); // Debug log

    const messages = await Message.find({
      recipientEmail: studentEmail,
      displayAfter: { $lte: now }
    }).sort({ createdAt: -1 }).lean();

    console.log(`Found ${messages.length} messages for ${studentEmail}`); // Debug log

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error); // Detailed error logging
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// Update the getUnreadCount helper function as well
// Get unread message count for student
exports.getUnreadCount = async (req, res) => {
  try {
    const studentEmail = res.locals.email;

    if (!studentEmail) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: email not found."
      });
    }

    const now = new Date();
    
    const unreadCount = await Message.countDocuments({
      recipientEmail: studentEmail,
      isRead: false,
      $or: [
        { displayAfter: { $lte: now } },
        { displayAfter: { $exists: false } }
      ]
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message
    });
  }
};


// exports.getUnreadCount = async (req, res) => {
//   try {
//     const studentEmail = res.locals.email;

//     if (!studentEmail) {
//       return res.status(401).json({ 
//         success: false, 
//         message: "Unauthorized: email not found." 
//       });
//     }

//     const count = await getUnreadCount(studentEmail);

//     res.status(200).json({ 
//       success: true,
//       unreadCount: count
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: "Failed to get unread count", 
//       error: error.message 
//     });
//   }
// };

// Helper function to get unread count (reusable)
// async function getUnreadCount(studentEmail) {
//   const now = new Date();
//   return await Message.countDocuments({
//     recipientEmail: studentEmail,
//     isRead: false,
//     $or: [
//       { returnTime: { $lte: now } },
//       { returnTime: { $exists: false } },
//     ]
//   });
// }

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const studentEmail = res.locals.email;

    if (!studentEmail) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: email not found." 
      });
    }

    // Validate messageId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid message ID format" 
      });
    }

    // Update only if message belongs to the student
    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        recipientEmail: studentEmail
      },
      { 
        $set: { isRead: true },
        $currentDate: { updatedAt: true } 
      },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ 
        success: false, 
        message: "Message not found or doesn't belong to you" 
      });
    }

    // Get updated unread count
    const unreadCount = await getUnreadCount(studentEmail);

    res.status(200).json({ 
      success: true,
      message: "Message marked as read",
      data: updatedMessage,
      unreadCount
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to mark message as read", 
      error: error.message 
    });
  }
};




