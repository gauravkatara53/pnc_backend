import mongoose from "mongoose";
import { string } from "zod";

const recruiterDetailSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. Microsoft, Google
  domain: { type: String, required: true }, // e.g. Technology, Finance
  hired: { type: String, required: true }, // number hired
  topPackage: { type: String, required: true }, // e.g. "₹1.8 Cr", "₹58 L"
  locations: [{ type: String, required: true }], // e.g. ["Hyderabad", "Bangalore"]
  logo: { type: String, required: true }, // company logo image URL
});

const topRecruitersSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true }, // e.g. "top-recruiters-2024"
    year: { type: Number, required: true }, // e.g. 2024

    // Overall stats
    totalRecruiters: { type: Number, required: true }, // 120+
    ppo: { type: Number, required: true }, // 45
    average: { type: Number, required: true }, // 68%
    risePlacement: { type: String, required: true }, // +15%

    // Banner image (optional, for the top image shown in UI)
    bannerImage: { type: String },

    // Companies list
    recruiters: [recruiterDetailSchema],
  },
  { timestamps: true }
);

const TopRecruiters = mongoose.model("TopRecruiters", topRecruitersSchema);

export default TopRecruiters;
