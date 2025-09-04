import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { app } from "./app.js";

// Load environment variables
dotenv.config({ path: "./.env" });

// Connect to MongoDB and start the Express server
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed!", err);
  });
