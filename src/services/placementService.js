import Placement from "../models/placementModel.js";
import CollegeProfile from "../models/collegeProfileModel.js";
import {
  setCache,
  getCache,
  deleteCache,
  deleteCacheByPrefix,
} from "../utils/nodeCache.js";
import PlacementStats from "../models/placementStatsModel.js";

// ✅ Create new placement record
export const createPlacementService = async (slug, data) => {
  // Attach slug from params
  if (!slug) throw new Error("College slug is required to create placement");
  const collegeExists = await CollegeProfile.findOne({ slug });
  if (!collegeExists) throw new Error("College not found for provided slug");
  const placement = await Placement.create({
    slug,
    ...data,
  });

  // Invalidate cache for this college placements
  deleteCacheByPrefix(`placements:${slug}`);

  return placement;
};

// ✅ Update placement record by slug
export const updatePlacementService = async (slug, updateData) => {
  const placement = await Placement.findOneAndUpdate({ slug }, updateData, {
    new: true,
    runValidators: true,
  });
  console.log("data is ----", slug);
  ``;

  if (!placement) throw new Error("Placement record not found");

  // Invalidate cache for this placement using placement slug
  deleteCacheByPrefix(`placements:${slug}`);

  return placement;
};
// ✅ Delete placement record by slug
export const deletePlacementService = async (slug) => {
  const placement = await Placement.findOneAndDelete({ slug });

  if (!placement) throw new Error("Placement record not found");

  // Invalidate cache for this college
  deleteCacheByPrefix(`placements:${placement.slug}`);

  return placement;
};

// ✅ Get placements by collegeId (cached)
export const getPlacementsByCollegeService = async (slug) => {
  const cacheKey = `placements:${slug}`;

  let placements = getCache(cacheKey);
  if (placements) return placements;

  placements = await Placement.find({ collegeId: slug });

  setCache(cacheKey, placements);
  return placements;
};

// Helper to create a unique cache key from filter object
const getCacheKey = (filter) => {
  return `placements:${filter.slug || ""}:${filter.branch || ""}:${
    filter.year || ""
  }`;
};

export const getPlacementsService = async (filter) => {
  const cacheKey = getCacheKey(filter);
  // Try to get cached result
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    return cachedData; // Return cached placements if exists
  }

  // If not cached, query DB
  const placements = await Placement.find(filter);

  // Cache for future requests (can use custom TTL here if desired)
  setCache(cacheKey, placements);

  return placements;
};
export const getPlacementsServiceByCollegeId = async (filter) => {
  return Placement.find(filter);
};

export const createPlacementStatsService = async (slug, data) => {
  if (!slug)
    throw new Error("College slug is required to create placement stats");
  const collegeExists = await CollegeProfile.findOne({ slug });
  if (!collegeExists) throw new Error("College not found for provided slug");
  const placementStats = await PlacementStats.create({
    slug,
    ...data,
  });

  // Invalidate cache for this college placements
  deleteCacheByPrefix(`placementStats:${slug}`);

  return placementStats;
};

// Service
export const getPlacementStatsByCollegeService = async (slug, year) => {
  // Create a query object
  const query = { slug };
  if (year) {
    query.year = Number(year); // ensure year is number
  }

  const cacheKey = `placementStats:${slug}:${year || "all"}`;

  let placementStats = getCache(cacheKey);
  if (placementStats) return placementStats;

  placementStats = await PlacementStats.find(query);

  setCache(cacheKey, placementStats);
  return placementStats;
};
