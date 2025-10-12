import Placement from "../models/placementModel.js";
import CollegeProfile from "../models/collegeProfileModel.js";
import { setCache, getCache } from "../utils/nodeCache.js";
import PlacementStats from "../models/placementStatsModel.js";
import TopRecruiters from "../models/topRecuritermodel.js";
import redis from "../libs/redis.js";
// ✅ Create new placement record
export const createPlacementService = async (slug, data) => {
  if (!slug) throw new Error("College slug is required to create placement");

  // Validate required placement data
  if (!data || typeof data !== "object") {
    throw new Error("Placement data is required and must be an object");
  }

  if (!data.year) {
    throw new Error("Year is required in placement data");
  }

  // Validate year
  const year = parseInt(data.year);
  if (isNaN(year) || year < 2000 || year > 2050) {
    throw new Error(
      `Invalid year provided: ${data.year}. Year must be between 2000 and 2050`
    );
  }

  const collegeExists = await CollegeProfile.findOne({ slug });
  if (!collegeExists) throw new Error("College not found for provided slug");

  // Create the placement record
  const placement = await Placement.create({
    slug,
    ...data,
  });

  if (!placement) {
    throw new Error("Failed to create placement record");
  }

  // Auto-update the college's availablePlacementReports - this will throw error if it fails
  const { autoUpdatePlacementYear } = await import(
    "../utils/placementYearUpdater.js"
  );
  try {
    await autoUpdatePlacementYear(slug, { year: year });
  } catch (yearUpdateError) {
    // If year update fails, we should delete the created placement record and throw error
    await Placement.findByIdAndDelete(placement._id);
    throw new Error(
      `Placement created but failed to update college placement years: ${yearUpdateError.message}`
    );
  }

  // Clear placement caches for this college
  const { clearPlacementCaches } = await import("../utils/cacheManager.js");
  await clearPlacementCaches(slug);

  return placement;
};

// ✅ Update placement record by id
export const updatePlacementService = async (id, updateData) => {
  console.log("Updating placement ID:", id);
  if (!id) throw new Error("Placement ID is required to update placement");

  const placement = await Placement.findOneAndUpdate(
    { _id: id }, // ✅ FIXED HERE
    updateData,
    { new: true, runValidators: true }
  );

  if (!placement) throw new Error("Placement record not found");
  return placement;
};

// ✅ Delete placement record by slug
export const deletePlacementService = async (id) => {
  if (!id) throw new Error("Placement ID is required to delete placement");

  const placement = await Placement.findByIdAndDelete(id); // ✅ FIXED
  if (!placement) throw new Error("Placement record not found");

  return placement;
};

export const getPlacementsByCollegeService = async (slug) => {
  const cacheKey = `placements:${slug}`;
  let placements = getCache(cacheKey);
  if (placements) return placements;
  placements = await Placement.find({ collegeId: slug });
  setCache(cacheKey, placements);
  return placements;
};

const getCacheKey = (filter) => {
  return `placements:${filter.slug || ""}:${filter.branch || ""}:${
    filter.year || ""
  }`;
};

export const getPlacementsService = async (filter) => {
  const cacheKey = `placements:${JSON.stringify(filter)}`;

  // 1. Try NodeCache (L1)
  let cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log("⚡ L1 NodeCache hit:", cacheKey);
    return cachedData;
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);
    const parsed = JSON.parse(cachedRedis);

    // Refill NodeCache for faster next time
    setCache(cacheKey, parsed, 300); // 5 min NodeCache
    return parsed;
  }

  // 3. Cache miss → Fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);
  const placements = await Placement.find(filter).lean();

  // Save into both caches
  setCache(cacheKey, placements, 300); // NodeCache → 5 min
  await redis.set(cacheKey, JSON.stringify(placements), "EX", 600); // Redis → 10 min

  console.log("✅ Cached in NodeCache + Redis:", cacheKey);

  return placements;
};

export const getPlacementsServiceByCollegeId = async (filter) => {
  return Placement.find(filter).lean();
};

export const createPlacementStatsService = async (slug, data) => {
  if (!slug)
    throw new Error("College slug is required to create placement stats");

  // Validate required placement stats data
  if (!data || typeof data !== "object") {
    throw new Error("Placement stats data is required and must be an object");
  }

  if (!data.year) {
    throw new Error("Year is required in placement stats data");
  }

  // Validate year
  const year = parseInt(data.year);
  if (isNaN(year) || year < 2000 || year > 2050) {
    throw new Error(
      `Invalid year provided: ${data.year}. Year must be between 2000 and 2050`
    );
  }

  const collegeExists = await CollegeProfile.findOne({ slug });
  if (!collegeExists) throw new Error("College not found for provided slug");

  const placementStats = await PlacementStats.create({
    slug,
    ...data,
  });

  if (!placementStats) {
    throw new Error("Failed to create placement stats record");
  }

  // Auto-update the college's availablePlacementReports - this will throw error if it fails
  const { autoUpdatePlacementYear } = await import(
    "../utils/placementYearUpdater.js"
  );
  try {
    await autoUpdatePlacementYear(slug, { year: year });
  } catch (yearUpdateError) {
    // If year update fails, we should delete the created placement stats record and throw error
    await PlacementStats.findByIdAndDelete(placementStats._id);
    throw new Error(
      `Placement stats created but failed to update college placement years: ${yearUpdateError.message}`
    );
  }

  return placementStats;
};

export const getPlacementStatsByCollegeService = async (slug, year) => {
  const query = { slug };
  if (year) {
    query.year = Number(year);
  }

  const cacheKey = `placementStats:${slug}:${year || "all"}`;

  // 1. Try NodeCache (L1)
  let placementStats = getCache(cacheKey);
  if (placementStats) {
    console.log("⚡ L1 NodeCache hit:", cacheKey);
    return placementStats;
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);
    placementStats = JSON.parse(cachedRedis);

    // Refill NodeCache for faster future hits
    setCache(cacheKey, placementStats, 300); // NodeCache: 5 min
    return placementStats;
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);
  placementStats = await PlacementStats.find(query).lean();

  // Save into both caches
  setCache(cacheKey, placementStats, 300); // NodeCache: 5 min
  await redis.set(cacheKey, JSON.stringify(placementStats), "EX", 600); // Redis: 10 min

  console.log("✅ Cached in L1 + L2:", cacheKey);

  return placementStats;
};

export const createTopRecruiterService = async (slug, data) => {
  if (!slug)
    throw new Error("College slug is required to create top recruiters");

  // Validate required top recruiter data
  if (!data || typeof data !== "object") {
    throw new Error("Top recruiter data is required and must be an object");
  }

  if (!data.year) {
    throw new Error("Year is required in top recruiter data");
  }

  // Validate year
  const year = parseInt(data.year);
  if (isNaN(year) || year < 2000 || year > 2050) {
    throw new Error(
      `Invalid year provided: ${data.year}. Year must be between 2000 and 2050`
    );
  }

  const collegeExists = await CollegeProfile.findOne({ slug });
  if (!collegeExists) throw new Error("College not found for provided slug");

  const topRecruiter = await TopRecruiters.create({
    slug,
    ...data,
  });

  if (!topRecruiter) {
    throw new Error("Failed to create top recruiter record");
  }

  // Auto-update the college's availablePlacementReports - this will throw error if it fails
  const { autoUpdatePlacementYear } = await import(
    "../utils/placementYearUpdater.js"
  );
  try {
    await autoUpdatePlacementYear(slug, { year: year });
  } catch (yearUpdateError) {
    // If year update fails, we should delete the created top recruiter record and throw error
    await TopRecruiters.findByIdAndDelete(topRecruiter._id);
    throw new Error(
      `Top recruiter created but failed to update college placement years: ${yearUpdateError.message}`
    );
  }

  return topRecruiter;
};

export const getTopRecruiterService = async (slug, year) => {
  if (!slug)
    throw new Error("College slug is required to fetch top recruiters");
  if (!year) throw new Error("Year is required to fetch top recruiters");

  const cacheKey = `topRecruiters:${slug}:${year}`;

  // 1. Try NodeCache (L1)
  let recruiterData = getCache(cacheKey);
  if (recruiterData) {
    console.log("⚡ L1 NodeCache hit:", cacheKey);
    return recruiterData;
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);
    recruiterData = JSON.parse(cachedRedis);

    // Refill NodeCache
    setCache(cacheKey, recruiterData, 300); // NodeCache TTL 5 min
    return recruiterData;
  }

  // 3. Cache miss → DB query
  console.log("❌ Cache miss (DB fetch):", cacheKey);
  recruiterData = await TopRecruiters.findOne({ slug, year }).lean();
  if (!recruiterData) return null;

  // Save into both caches
  setCache(cacheKey, recruiterData, 300); // NodeCache (5 min)
  await redis.set(cacheKey, JSON.stringify(recruiterData), "EX", 600); // Redis (10 min)

  console.log("✅ Cached in L1 + L2:", cacheKey);

  return recruiterData;
};
