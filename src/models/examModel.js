import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  examName: { type: String, required: true, default: "JEE-Advanced" },
  category: { type: String, required: true, default: "NationalEngineering" },
  examDate: { type: Date, required: true }, // e.g., "2024-06-04"
  conductedBy: { type: String, required: true, default: "IIT Delhi" },
  registrationUrl: { type: String }, // URL for registration/details
  imageUrl: { type: String }, // URL of official exam logo or image

  examType: {
    // New field for exam category/type
    type: String,
    enum: ["Engineering", "Medical", "Management", "Law", "Design"],
    required: true,
    default: "Engineering",
  },
});

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
