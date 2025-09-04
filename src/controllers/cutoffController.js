// controllers/cutoffController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import Cutoff from "../models/cutoffModel.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { setCache, getCache, deleteCacheByPrefix } from "../utils/nodeCache.js";

// Utility to build filter from query params
const buildFilter = (query) => {
  const filter = {};
  if (query.slug) filter.slug = query.slug;
  if (query.year) filter.year = Number(query.year);
  if (query.branch) filter.branch = query.branch;
  if (query.quota) filter.quota = query.quota;
  if (query.course) filter.course = query.course;
  if (query.seatType) filter.seatType = query.seatType;
  if (query.subCategory) filter.subCategory = query.subCategory;
  if (query.round) filter.round = query.round; // Keep as string per schema
  return filter;
};

// Create cutoff
export const createCutoffController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  // spread all cutoff fields from req.body
  const data = {
    slug,
    ...req.body,
  };

  const cutoff = await Cutoff.create(data);

  // Invalidate cache for this college cutoffs
  deleteCacheByPrefix(`cutoffs:${slug}`);

  res
    .status(201)
    .json(new ApiResponse(201, cutoff, "Cutoff created successfully"));
});

// Update cutoff by id
export const updateCutoffController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const updatedCutoff = await Cutoff.findOneAndUpdate({ slug }, req.body, {
    new: true,
  });
  if (!updatedCutoff) {
    return res.status(404).json(new ApiResponse(404, null, "Cutoff not found"));
  }

  // Invalidate cache for the affected slug
  deleteCacheByPrefix(`cutoffs:${updatedCutoff.slug}`);

  res
    .status(200)
    .json(new ApiResponse(200, updatedCutoff, "Cutoff updated successfully"));
});

// Delete cutoff by id
export const deleteCutoffController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const deletedCutoff = await Cutoff.findOneAndDelete({ slug });
  if (!deletedCutoff) {
    return res.status(404).json(new ApiResponse(404, null, "Cutoff not found"));
  }

  // Invalidate cache for the affected slug
  deleteCacheByPrefix(`cutoffs:${deletedCutoff.slug}`);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Cutoff deleted successfully"));
});

// Get all cutoffs with filtering and caching
export const getAllCutoffsController = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const cacheKey = `cutoffs:${JSON.stringify(filter)}`;
  let cutoffs = getCache(cacheKey);

  if (!cutoffs) {
    cutoffs = await Cutoff.find(filter).lean();
    setCache(cacheKey, cutoffs, 24 * 60 * 60); // cache 1 day
  }

  res
    .status(200)
    .json(new ApiResponse(200, cutoffs, "Cutoffs fetched successfully"));
});
