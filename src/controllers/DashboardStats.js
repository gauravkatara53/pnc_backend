import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import CollegeProfile from "../models/collegeProfileModel.js";
import NewsArticle from "../models/newsModel.js";
import { setCache, getCache, deleteCacheByPrefix } from "../utils/nodeCache.js";
import redis from "../libs/redis.js";

// Helper function to clear dashboard stats caches
const clearDashboardStatsCaches = async () => {
  try {
    console.log("🧹 Clearing dashboard stats caches...");

    // Clear NodeCache patterns
    deleteCacheByPrefix("dashboard:"); // Clear all dashboard caches

    // Clear Redis patterns
    const redisKeys = await redis.keys("dashboard:*");
    if (redisKeys.length > 0) {
      await redis.del(...redisKeys);
      console.log(
        `🧹 Cleared ${redisKeys.length} Redis keys with pattern dashboard:*`
      );
    }

    console.log("✅ Dashboard stats caches cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing dashboard stats caches:", error);
  }
};

// Get simplified dashboard statistics with caching
export const getDashboardStatsController = asyncHandler(async (req, res) => {
  const cacheKey = "dashboard:stats";

  // 1. Try Node-cache (L1, fast)
  let cachedStats = getCache(cacheKey);
  if (cachedStats) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cachedStats,
          "Dashboard stats fetched successfully (cached)"
        )
      );
  }

  // 2. Try Redis (L2, shared)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    const parsed = JSON.parse(cachedRedis);

    // Save into Node-cache for next time (super-fast hit)
    setCache(cacheKey, parsed, 300); // 5 minutes TTL

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          parsed,
          "Dashboard stats fetched successfully (cached)"
        )
      );
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  // Simplified parallel queries - only basic counts needed
  const [
    totalColleges,
    engineeringColleges,
    medicalColleges,
    managementColleges,
    otherColleges,
    totalNewsArticles,
  ] = await Promise.all([
    // Total colleges count
    CollegeProfile.countDocuments(),

    // Engineering colleges (multiple possible tags/types)
    CollegeProfile.countDocuments({
      $or: [
        { instituteType: { $regex: /engineering/i } },
        { tag: { $regex: /engineering/i } },
        { stream: { $regex: /engineering/i } },
      ],
    }),

    // Medical colleges
    CollegeProfile.countDocuments({
      $or: [
        { instituteType: { $regex: /medical/i } },
        { tag: { $regex: /medical/i } },
        { stream: { $regex: /medical/i } },
      ],
    }),

    // Management colleges
    CollegeProfile.countDocuments({
      $or: [
        { instituteType: { $regex: /management|mba|business/i } },
        { tag: { $regex: /management|mba|business/i } },
        { stream: { $regex: /management|mba|business/i } },
      ],
    }),

    // Other colleges (not engineering, medical, or management)
    CollegeProfile.countDocuments({
      $and: [
        {
          $nor: [
            {
              instituteType: {
                $regex: /engineering|medical|management|mba|business/i,
              },
            },
            { tag: { $regex: /engineering|medical|management|mba|business/i } },
            {
              stream: {
                $regex: /engineering|medical|management|mba|business/i,
              },
            },
          ],
        },
      ],
    }),

    // Total news articles count
    NewsArticle.countDocuments(),
  ]);

  // Calculate percentages
  const engineeringPercentage =
    totalColleges > 0
      ? ((engineeringColleges / totalColleges) * 100).toFixed(1)
      : 0;
  const medicalPercentage =
    totalColleges > 0
      ? ((medicalColleges / totalColleges) * 100).toFixed(1)
      : 0;
  const managementPercentage =
    totalColleges > 0
      ? ((managementColleges / totalColleges) * 100).toFixed(1)
      : 0;
  const otherPercentage =
    totalColleges > 0 ? ((otherColleges / totalColleges) * 100).toFixed(1) : 0;

  const dashboardStats = {
    engineering: {
      count: engineeringColleges,
      percentage: parseFloat(engineeringPercentage),
    },
    medical: {
      count: medicalColleges,
      percentage: parseFloat(medicalPercentage),
    },
    management: {
      count: managementColleges,
      percentage: parseFloat(managementPercentage),
    },
    others: {
      count: otherColleges,
      percentage: parseFloat(otherPercentage),
    },
    news: {
      total: totalNewsArticles,
    },
  };

  // Save to both caches
  setCache(cacheKey, dashboardStats, 300); // Node-cache (5 min TTL)
  await redis.set(cacheKey, JSON.stringify(dashboardStats), "EX", 600); // Redis (10 min TTL)

  console.log("✅ Dashboard stats cached in Node-cache + Redis:", cacheKey);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dashboardStats,
        "Dashboard stats fetched successfully"
      )
    );
});

// Get college statistics by type
export const getCollegeTypeStatsController = asyncHandler(async (req, res) => {
  const cacheKey = "dashboard:college-types";

  // 1. Try Node-cache (L1)
  let cachedStats = getCache(cacheKey);
  if (cachedStats) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cachedStats,
          "College type stats fetched successfully (cached)"
        )
      );
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    const parsed = JSON.parse(cachedRedis);
    setCache(cacheKey, parsed, 300);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          parsed,
          "College type stats fetched successfully (cached)"
        )
      );
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  const collegeTypeStats = await CollegeProfile.aggregate([
    {
      $group: {
        _id: "$instituteType",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $project: {
        type: "$_id",
        count: 1,
        _id: 0,
      },
    },
  ]);

  const result = {
    collegeTypes: collegeTypeStats,
    total: collegeTypeStats.reduce((sum, item) => sum + item.count, 0),
    lastUpdated: new Date().toISOString(),
  };

  // Save to both caches
  setCache(cacheKey, result, 300);
  await redis.set(cacheKey, JSON.stringify(result), "EX", 600);

  res
    .status(200)
    .json(
      new ApiResponse(200, result, "College type stats fetched successfully")
    );
});

// Clear dashboard caches (admin endpoint)
export const clearDashboardCacheController = asyncHandler(async (req, res) => {
  await clearDashboardStatsCaches();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Dashboard caches cleared successfully"));
});

// Export the cache clearing function for use in other controllers
export { clearDashboardStatsCaches };
