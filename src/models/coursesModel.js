import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true }, // e.g., "Computer Science and Engineering"
  durationYears: { type: Number, required: true, min: 1 }, // e.g., 4
  degree: { type: String, required: true }, // e.g., "B.Tech"
  description: { type: String, required: true }, // Course description
  feeRange: {
    min: { type: Number, required: true, min: 0 }, // Minimum fee in Lakhs
    max: { type: Number, required: true, min: 0 }, // Maximum fee in Lakhs
  },
  level: {
    type: String,
    enum: ["Undergraduate", "Postgraduate", "Diploma", "Doctorate"],
    required: true,
  },
  entranceExams: { type: [String], required: true }, // List of exams e.g., ["JEE Main", "JEE Advanced", "BITSAT"]
  demandStatus: {
    type: String,
    enum: ["High Demand", "Moderate Demand", "Low Demand"],
    default: "Moderate Demand",
  },
  iconUrl: { type: String }, // URL string for the icon (optional)
});

const Course = mongoose.model("Course", courseSchema);

export default Course;
