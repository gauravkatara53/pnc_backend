// controllers/predictorController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import Cutoff from "../models/cutoffModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { setCache, getCache } from "../utils/nodeCache.js";
import redis from "../libs/redis.js";
import CollegeProfile from "../models/collegeProfileModel.js";

/**
 * Predicts colleges based on rank, category, and other parameters with advanced analytics
 */
export const predictColleges = asyncHandler(async (req, res) => {
  const { exam, rank, subCategory, seatType, domicile } = req.query;

  if (!exam || !rank || !subCategory || !seatType) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Missing required parameters: exam, rank, subCategory, and seatType"
        )
      );
  }

  // Cache key based on all input parameters
  const cacheKey = `predictor:${exam}:${rank}:${subCategory}:${seatType}:${
    domicile || "All-India"
  }`;

  // Try cache first
  let results = getCache(cacheKey);
  if (results) {
    return res
      .status(200)
      .json(new ApiResponse(200, results, "Predictions fetched from cache"));
  }

  // Try Redis cache
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    results = JSON.parse(cachedRedis);
    setCache(cacheKey, results, 3600); // Cache for 1 hour in node-cache
    return res
      .status(200)
      .json(new ApiResponse(200, results, "Predictions fetched from Redis"));
  }

  // If not in cache, fetch from DB
  const currentYear = 2025;

  // Fetch all relevant cutoffs and sort them
  const cutoffs = await Cutoff.find({
    examType: exam,
    subCategory: subCategory,
    seatType: seatType,
    year: { $in: [currentYear, currentYear - 1] }, // 2025 and 2024 data
    closingRank: { $gte: parseInt(rank) },
    ...(domicile && { state: domicile }), // Add state filter if domicile is provided
  }).lean();

  // Get unique slugs from cutoffs
  const uniqueSlugs = [...new Set(cutoffs.map((c) => c.slug))];

  // Fetch college profiles
  const collegeProfiles = await CollegeProfile.find({
    slug: { $in: uniqueSlugs },
  }).lean();

  // Group cutoffs by college and branch
  const collegeMap = new Map();

  cutoffs.forEach((cutoff) => {
    const key = `${cutoff.slug}-${cutoff.branch}`;
    if (!collegeMap.has(key)) {
      const college = collegeProfiles.find((c) => c.slug === cutoff.slug) || {};
      collegeMap.set(key, {
        collegeName: college.name || cutoff.slug,
        location: `${college.location || ""}, ${college.state || ""}`.trim(),
        nirfRank: college.nirf ? `NIRF #${college.nirf}` : 0,
        course: `${cutoff.course} in ${cutoff.branch}`,
        fees: college.fees ? `₹${college.fees}` : 0,
        // College Details
        instituteType: college.instituteType,
        stream: college.stream,
        tag: college.tag,
        // Placement Details
        avgPackage: college.avgSalary ? `₹${college.avgSalary}L` : undefined,
        // Additional Details
        subCategory: cutoff.subCategory,
        seatType: cutoff.seatType,

        cutoff: [],
      });
    }

    const collegeData = collegeMap.get(key);
    const existingRound = collegeData.cutoff.find(
      (r) => r.round === cutoff.round
    );

    if (!existingRound) {
      collegeData.cutoff.push({
        round: cutoff.round,
        cr2025: cutoff.year === 2025 ? cutoff.closingRank : undefined,
        cr2024: cutoff.year === 2024 ? cutoff.closingRank : undefined,
      });
    } else {
      if (cutoff.year === 2025) existingRound.cr2025 = cutoff.closingRank;
      if (cutoff.year === 2024) existingRound.cr2024 = cutoff.closingRank;
    }
  });

  // Helper function to get round priority
  const getRoundPriority = (round) => {
    // Define round priorities (lower number = higher priority)
    const priorities = {
      "Round-1": 1,
      "Round-2": 2,
      "Round-3": 3,
      "Round-4": 4,
      "Round-5": 5,
      "Round-6": 6,
      "CSAB-1": 7,
      "CSAB-2": 8,
      "CSAB-3": 9,
      Special: 10,
    };
    return priorities[round] || 999; // Unknown rounds get lowest priority
  };

  // Convert map to array and sort primarily by NIRF rank
  const cleanResults = Array.from(collegeMap.values())
    .map((college) => {
      // Sort rounds within each college
      const sortedCutoff = [...college.cutoff].sort((a, b) => {
        return getRoundPriority(a.round) - getRoundPriority(b.round);
      });
      return { ...college, cutoff: sortedCutoff };
    })
    .sort((a, b) => {
      // Extract NIRF numbers (remove "NIRF #" and convert to number)
      const hasNirfA = a.nirfRank && a.nirfRank !== 0;
      const hasNirfB = b.nirfRank && b.nirfRank !== 0;

      // If one has NIRF and other doesn't, prioritize the one with NIRF
      if (hasNirfA && !hasNirfB) return -1;
      if (!hasNirfA && hasNirfB) return 1;

      // Get NIRF ranks for both colleges
      const aNirf = parseInt(
        a.nirfRank?.toString().replace(/\D/g, "") || "999999"
      );
      const bNirf = parseInt(
        b.nirfRank?.toString().replace(/\D/g, "") || "999999"
      );

      // If NIRF ranks are different, sort by NIRF
      if (aNirf !== bNirf) {
        return aNirf - bNirf;
      }

      // If NIRF ranks are same or both don't have NIRF, sort by closest rank
      const userRank = parseInt(rank);

      // Get all valid ranks for both colleges
      const aRanks = a.cutoff
        .map((c) => [c.cr2025, c.cr2024])
        .flat()
        .filter((r) => r !== undefined);
      const bRanks = b.cutoff
        .map((c) => [c.cr2025, c.cr2024])
        .flat()
        .filter((r) => r !== undefined);

      if (aRanks.length === 0 && bRanks.length === 0) return 0;
      if (aRanks.length === 0) return 1;
      if (bRanks.length === 0) return -1;

      // Find closest ranks to user's rank
      const aClosest = Math.min(...aRanks.map((r) => Math.abs(r - userRank)));
      const bClosest = Math.min(...bRanks.map((r) => Math.abs(r - userRank)));
      return aNirf - bNirf;
    })
    .map((result) => {
      // Remove undefined fields
      const cleanResult = {};
      Object.entries(result).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          cleanResult[key] = value;
        }
      });
      return cleanResult;
    });

  // Cache the results
  setCache(cacheKey, cleanResults, 3600); // Cache for 1 hour in node-cache
  await redis.set(cacheKey, JSON.stringify(cleanResults), "EX", 3600); // Cache for 1 hour in Redis

  return res
    .status(200)
    .json(
      new ApiResponse(200, cleanResults, "Predictions generated successfully")
    );
});
