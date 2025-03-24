const messageSchema = new mongoose.Schema({
  text: String, // Message text (e.g., "Are you in the chair?")
  status: String, // "yes", "no", "inactive"
  createdAt: { type: Date, default: Date.now }, // Timestamp
});

const Message = mongoose.model("Message", messageSchema);