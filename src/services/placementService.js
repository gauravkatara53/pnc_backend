import Placement from "../models/placementModel.js";
import CollegeProfile from "../models/collegeProfileModel.js";
import {
  setCache,
  getCache,
  deleteCache,
  deleteCacheByPrefix,
  getOrSetCache,
} from "../utils/nodeCache.js";
import PlacementStats from "../models/placementStatsModel.js";
import TopRecruiters from "../models/topRecuritermodel.js";

// ✅ Create new placement record
export const createPlacementService = async (slug, data) => {
  if (!slug) throw new Error("College slug is required to create placement");
  const collegeExists = await CollegeProfile.findOne({ slug });
  if (!collegeExists) throw new Error("College not found for provided slug");
  const placement = await Placement.create({
    slug,
    ...data,
  });

  // Optionally invalidate cache here also if centralizing cache eviction
  // deleteCacheByPrefix(`placements:${slug}`);
  // deleteCacheByPrefix(`placementsBySlug:${slug}`);

  return placement;
};

// ✅ Update placement record by slug
export const updatePlacementService = async (slug, updateData) => {
  const placement = await Placement.findOneAndUpdate({ slug }, updateData, {
    new: true,
    runValidators: true,
  });
  if (!placement) throw new Error("Placement record not found");
  return placement;
};

// ✅ Delete placement record by slug
export const deletePlacementService = async (slug) => {
  const placement = await Placement.findOneAndDelete({ slug });
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
  const cacheKey = getCacheKey(filter);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  const placements = await Placement.find(filter);
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
  return placementStats;
};

export const getPlacementStatsByCollegeService = async (slug, year) => {
  const query = { slug };
  if (year) {
    query.year = Number(year);
  }
  const cacheKey = `placementStats:${slug}:${year || "all"}`;
  let placementStats = getCache(cacheKey);
  if (placementStats) return placementStats;
  placementStats = await PlacementStats.find(query);
  setCache(cacheKey, placementStats);
  return placementStats;
};

export const createTopRecruiterService = async (slug, data) => {
  if (!slug)
    throw new Error("College slug is required to create top recruiters");
  const collegeExists = await CollegeProfile.findOne({ slug });
  if (!collegeExists) throw new Error("College not found for provided slug");
  const topRecruiter = await TopRecruiters.create({
    slug,
    ...data,
  });
  return topRecruiter;
};

export const getTopRecruiterService = async (slug, year) => {
  if (!slug)
    throw new Error("College slug is required to fetch top recruiters");
  if (!year) throw new Error("Year is required to fetch top recruiters");

  const cacheKey = `topRecruiters:${slug}:${year}`;
  return await getOrSetCache(
    cacheKey,
    async () => {
      const data = await TopRecruiters.findOne({ slug, year }).lean();
      if (!data) return null;
      return data;
    },
    60 * 60 * 24
  );
};
