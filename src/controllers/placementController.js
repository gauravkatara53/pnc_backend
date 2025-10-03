import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createPlacementService,
  updatePlacementService,
  deletePlacementService,
  getPlacementsService,
  getPlacementsServiceByCollegeId,
  getPlacementStatsByCollegeService,
  createPlacementStatsService,
  createTopRecruiterService,
  getTopRecruiterService,
} from "../services/placementService.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import redis from "../libs/redis.js";
// ✅ Create placement (slug from params)

import { setCache, getCache, deleteCacheByPrefix } from "../utils/nodeCache.js";

// ✅ Create new placement record
export const createPlacementController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    branch,
    placementPercentage,
    medianPackageLPA,
    highestPackageLPA,
    averagePackageLPA,
    year,
  } = req.body;

  const placement = await createPlacementService(slug, {
    branch,
    placementPercentage,
    medianPackageLPA,
    highestPackageLPA,
    averagePackageLPA,
    year,
  });

  // Invalidate cache for this college's placements
  deleteCacheByPrefix(`placements:${slug}`);

  res
    .status(201)
    .json(new ApiResponse(201, placement, "Placement created successfully"));
});

// ✅ Bulk create placements
export const bulkCreatePlacementController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const placementsArray = req.body; // Expecting an array of placement objects

  if (!Array.isArray(placementsArray) || placementsArray.length === 0) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, "Request body must be a non-empty array")
      );
  }

  const createdPlacements = await Promise.all(
    placementsArray.map((placement) => createPlacementService(slug, placement))
  );

  // Invalidate both cache keys for this slug to cover all cached listings
  deleteCacheByPrefix(`placements:${slug}`); // For filter-based cache keys
  deleteCacheByPrefix(`placementsBySlug:${slug}`); // For placements by college ID cache

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdPlacements,
        "Placements created in bulk successfully"
      )
    );
});

// ✅ Update placement
export const updatePlacementController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const placement = await updatePlacementService(slug, req.body);

  // Invalidate cache for this college's placements
  deleteCacheByPrefix(`placements:${slug}`);

  res
    .status(200)
    .json(new ApiResponse(200, placement, "Placement updated successfully"));
});

// ✅ Delete placement
export const deletePlacementController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  await deletePlacementService(slug);

  // Invalidate cache for this college's placements
  deleteCacheByPrefix(`placements:${slug}`);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Placement deleted successfully"));
});

export const getPlacementsController = asyncHandler(async (req, res) => {
  const { slug, branch, year } = req.query;

  // Build filter
  const filter = {};
  if (slug) filter.slug = slug;
  if (branch) filter.branch = branch;
  if (year) filter.year = year;

  const placements = await getPlacementsService(filter);

  res
    .status(200)
    .json(new ApiResponse(200, placements, "Placements fetched successfully"));
});

export const getPlacementsByCollegeIdController = asyncHandler(
  async (req, res) => {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ message: "slug is required" });
    }

    const cacheKey = `placementsBySlug:${slug}`;

    // 1. Try NodeCache (L1)
    let placements = getCache(cacheKey);
    if (placements) {
      console.log("⚡ L1 NodeCache hit:", cacheKey);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            placements,
            "Placements fetched successfully (L1 cache)"
          )
        );
    }

    // 2. Try Redis (L2)
    const cachedRedis = await redis.get(cacheKey);
    if (cachedRedis) {
      console.log("⚡ L2 Redis hit:", cacheKey);

      placements = JSON.parse(cachedRedis);

      // Refill NodeCache for faster local hits
      setCache(cacheKey, placements, 300); // 5 min TTL in NodeCache

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            placements,
            "Placements fetched successfully (L2 cache)"
          )
        );
    }

    // 3. Cache miss → Fetch from DB
    console.log("❌ Cache miss (DB fetch):", cacheKey);
    placements = await getPlacementsServiceByCollegeId({ slug });

    // Save into both caches
    setCache(cacheKey, placements, 300); // NodeCache (5 min)
    await redis.set(cacheKey, JSON.stringify(placements), "EX", 600); // Redis (10 min)

    console.log("✅ Cached in L1 + L2:", cacheKey);

    return res
      .status(200)
      .json(
        new ApiResponse(200, placements, "Placements fetched successfully (DB)")
      );
  }
);

export const createPlacementStatsController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    year,
    totalOffers,
    highestPackage,
    averagePackage,
    recruiters,
    graph_url,
  } = req.body;

  const placementStats = await createPlacementStatsService(slug, {
    year,
    totalOffers,
    highestPackage,
    averagePackage,
    recruiters,
    graph_url,
  });

  // Invalidate cache for placement stats of this college
  deleteCacheByPrefix(`placementStats:${slug}`);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        placementStats,
        "Placement stats created successfully"
      )
    );
});

export const getPlacementStatsByCollegeController = asyncHandler(
  async (req, res) => {
    const { slug } = req.params;
    const { year } = req.query;

    const placementStats = await getPlacementStatsByCollegeService(slug, year);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          placementStats,
          "Placement stats fetched successfully"
        )
      );
  }
);

export const createTopRecruiterController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    year,
    totalRecruiters,
    ppo,
    average,
    risePlacement,
    bannerImage,
    recruiters,
  } = req.body;

  const topRecruiter = await createTopRecruiterService(slug, {
    year,
    totalRecruiters,
    ppo,
    average,
    risePlacement,
    bannerImage,
    recruiters,
  });

  // Invalidate cache for top recruiters of this college
  deleteCacheByPrefix(`topRecruiters:${slug}`);

  res
    .status(201)
    .json(
      new ApiResponse(201, topRecruiter, "Top Recruiters created successfully")
    );
});

export const getTopRecruiterController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { year } = req.query;

  const topRecruiter = await getTopRecruiterService(slug, Number(year));

  if (!topRecruiter) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, null, `Top recruiters not found for year ${year}`)
      );
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, topRecruiter, "Top Recruiters fetched successfully")
    );
});
