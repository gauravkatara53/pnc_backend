import mongoose from "mongoose";

const placementStatsSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
  },
  year: { type: Number, required: true },

  totalOffers: { type: Number, required: true },

  highestPackage: { type: Number }, // e.g., 50.00

  averagePackage: { type: Number, min: 0 }, // e.g., 6.00

  recruiters: { type: Number, min: 0 }, // e.g., 18.00
  graph_url: { type: String },
  company_url: { type: String },
});

const PlacementStats = mongoose.model("PlacementStats", placementStatsSchema);

export default PlacementStats;
