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
exports.getRandomMotivationTip = async (req, res) => {
  try {
    // Fetch a random motivation tip from the database
    const count = await MotivationTip.countDocuments();
    const randomIndex = Math.floor(Math.random() * count);
    const randomTip = await MotivationTip.findOne().skip(randomIndex); // Skip a random index

    if (!randomTip) {
      return res.status(404).json({ message: 'No motivation tip found' });
    }

    res.status(200).json({ message: 'Random motivation tip fetched successfully!', data: randomTip });
  } catch (error) {
    console.error('Error fetching random motivation tip:', error);
    res.status(500).json({ message: 'Failed to fetch random motivation tip' });
  }
};