const MotivationTip = require('../model/messageN'); // Adjust path if needed

// Controller to insert a new motivation tip
exports.createMotivationTip = async (req, res) => {
  try {
    // Get the data from the request body
    const { tip, expiresAt } = req.body;

    // Validate the input data
    if (!tip || !expiresAt) {
      return res.status(400).json({ message: 'Tip and expiresAt are required.' });
    }

    // Create a new motivation tip document
    const newTip = new MotivationTip({
      tip,
      expiresAt
    });

    // Save the new tip to the database
    await newTip.save();

    // Respond with success message
    res.status(201).json({ message: 'Motivation tip created successfully!', data: newTip });
  } catch (error) {
    console.error('Error creating motivation tip:', error);
    res.status(500).json({ message: 'Failed to create motivation tip' });
  }
};
