import mongoose from "mongoose";

const placementSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
  },
  year: { type: Number, required: true }, // e.g., 2023

  branch: { type: String, required: true }, // e.g., "Bio Technology"

  placementPercentage: { type: Number, min: 0, max: 100 }, // e.g., 50.00

  medianPackageLPA: { type: Number, min: 0 }, // e.g., 6.00

  highestPackageLPA: { type: Number, min: 0 }, // e.g., 18.00

  averagePackageLPA: { type: Number, min: 0 }, // e.g., 7.37
});

const Placement = mongoose.model("Placement", placementSchema);

export default Placement;
