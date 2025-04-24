const mongoose = require("mongoose");

const motivationTipSchema = new mongoose.Schema({
  tip: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true // Time after which the tip expires 
  },
  createdAt: { 
    type: Date, 
    default: Date.now // Timestamp when the tip was created 
  }
});

module.exports = mongoose.model("MotivationTip", motivationTipSchema);
