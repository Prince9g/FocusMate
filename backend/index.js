import express from 'express';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
dotenv.config();
const app = express();

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});