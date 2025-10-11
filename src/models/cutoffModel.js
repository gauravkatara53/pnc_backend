import mongoose from "mongoose";

const cutoffSchema = new mongoose.Schema(
  {
    examType: {
      type: String,
      enum: [
        "JEE-Main",
        "JEE-Advanced",
        "NEET-UG",
        "GATE",
        "CAT",
        "CLAT",
        "NMAT",
        "XAT",
        "MAT",
        "CMAT",
        "SNAP",
      ], // Add other exams as needed
      required: true,
    },
    year: { type: Number, required: true },

    slug: {
      type: String,
      required: true,
    },
    course: { type: String, required: true }, //4 (5year) Years, Bachelor of Technology

    branch: { type: String, required: true }, //Academic Program Name

    seatType: { type: String, required: true },

    subCategory: { type: String, required: true },

    quota: {
      type: String,
      required: true,
    },

    openingRank: { type: Number }, // Optional, depending on exam cutoff format
    closingRank: { type: Number }, // Optional
    round: { type: String, required: true },

    comment: String,
  },
  { timestamps: true }
);

const Cutoff = mongoose.model("Cutoff", cutoffSchema);

export default Cutoff;
