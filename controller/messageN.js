const Message = require("../model/messageN");

// 🚀 **Insert Message (Staff)**
exports.addMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const newMessage = new Message({ text, status: "pending" });
    await newMessage.save();
    res.status(201).json({ message: "Message added successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error adding message" });
  }
};

// 🚀 **Fetch Latest Message (Student)**
exports.getLatestMessage = async (req, res) => {
  try {
    const message = await Message.findOne().sort({ createdAt: -1 });
    if (!message) {
      return res.status(404).json({ message: "No message found" });
    }
    res.json({ message: message.text });
  } catch (error) {
    res.status(500).json({ error: "Error fetching message" });
  }
};

// 🚀 **Student Response to Message**
exports.respondToMessage = async (req, res) => {
  try {
    const { response } = req.body;
    const latestMessage = await Message.findOne().sort({ createdAt: -1 });

    if (!latestMessage) {
      return res.status(404).json({ error: "No message found" });
    }

    latestMessage.status = response;
    await latestMessage.save();

    res.json({ message: "Response saved successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error saving response" });
  }
};
