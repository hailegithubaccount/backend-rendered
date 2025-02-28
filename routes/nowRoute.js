const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const router = express.Router();

// Database connection URI
const uri = "mongodb+srv://root:root@cluster0.ufr9m.mongodb.net/";
const client = new MongoClient(uri);
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 

// Fetch data from 'newbooks.now' (without image field)
router.get("/",protect,checkRole("library-staff"), checkUserExists, async (req, res) => {
  try {
    await client.connect();
    const db = client.db("newbooks");
    const collection = db.collection("detec");

    const data = await collection.find({}, { projection: { image: 0 } }).toArray(); // Exclude image field

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
});

module.exports = router;
