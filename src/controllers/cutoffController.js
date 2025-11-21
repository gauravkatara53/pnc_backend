// controllers/cutoffController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import Cutoff from "../models/cutoffModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { setCache, getCache, deleteCacheByPrefix } from "../utils/nodeCache.js";
import redis from "../libs/redis.js";
import { clearCutoffCaches } from "../utils/cacheManager.js";

// Bulk create cutoffs
export const bulkCreateCutoffController = asyncHandler(async (req, res) => {
  // Fixed fields allowed from req.body
  const {
    examType,
    year,
    slug,
    seatType,
    subCategory,
    cutoffs, // Each item now contains quota, course, branch, round, ranks etc.
  } = req.body;

  if (!Array.isArray(cutoffs) || cutoffs.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "cutoffs array required"));
  }

  // Compose bulk data → only 5 fixed fields + all item fields
  const bulkData = cutoffs.map((item) => ({
    examType,
    year,
    slug,
    seatType,
    subCategory,
    ...item, // quota, course, branch, round, openingRank, closingRank
  }));

  // Insert many
  const result = await Cutoff.insertMany(bulkData);

  // Clear cutoff caches for this slug
  await clearCutoffCaches(slug);

  res
    .status(201)
    .json(new ApiResponse(201, result, "Bulk cutoffs created successfully"));
});

// Create cutoff
export const createCutoffController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  // spread all cutoff fields from req.body
  const data = {
    slug,
    ...req.body,
  };

  const cutoff = await Cutoff.create(data);

  // Clear cutoff caches for this college
  await clearCutoffCaches(slug);

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

  // Clear cutoff caches for the affected college
  await clearCutoffCaches(updatedCutoff.slug);

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

  // Clear cutoff caches for the affected college
  await clearCutoffCaches(deletedCutoff.slug);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Cutoff deleted successfully"));
});

const buildFilter = (query) => {
  const filter = {};
  if (query.slug) filter.slug = query.slug;
  if (query.examType) filter.examType = query.examType;
  if (query.year) filter.year = Number(query.year);
  if (query.branch) filter.branch = query.branch;
  if (query.quota) filter.quota = query.quota;
  if (query.course) filter.course = query.course;
  if (query.seatType) filter.seatType = query.seatType;
  if (query.subCategory) filter.subCategory = query.subCategory;
  if (query.round) filter.round = query.round; // Keep as string per schema
  return filter;
};

export const getAllCutoffsController = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const cacheKey = `cutoffs:${JSON.stringify(filter)}`;

  // 1. Try Node-cache (L1)
  let cutoffs = getCache(cacheKey);
  if (cutoffs) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return res
      .status(200)
      .json(new ApiResponse(200, cutoffs, "Cutoffs fetched successfully (L1)"));
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    cutoffs = JSON.parse(cachedRedis);

    // Save into Node-cache for next time (super fast)
    setCache(cacheKey, cutoffs, 24 * 60 * 60);

    return res
      .status(200)
      .json(new ApiResponse(200, cutoffs, "Cutoffs fetched successfully (L2)"));
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  cutoffs = await Cutoff.find(filter).lean();

  // Save into both caches (1 day TTL)
  setCache(cacheKey, cutoffs, 24 * 60 * 60); // Node-cache
  await redis.set(cacheKey, JSON.stringify(cutoffs), "EX", 24 * 60 * 60); // Redis

  console.log("✅ Cached in Node-cache + Redis:", cacheKey);

  return res
    .status(200)
    .json(new ApiResponse(200, cutoffs, "Cutoffs fetched successfully (DB)"));
});

/**
 * Delete all cutoffs where slug starts with "iiit-"
 */
export const deleteAllIIITCutoffsController = asyncHandler(async (req, res) => {
  const result = await Cutoff.deleteMany({
    slug: { $regex: /^iiit-/ },
    year: 2025,
    round: { $in: ["CSAB-1", "CSAB-2"] },
  });

  // Invalidate all related cache entries
  deleteCacheByPrefix("cutoffs:iiit-");

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedCount: result.deletedCount },
        "All IIIT cutoffs for year 2025 and round CSAB-1 or CSAB-2 deleted successfully"
      )
    );
});
