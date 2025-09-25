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
import { getCache, setCache } from "../utils/nodeCache.js";
// ✅ Create placement (slug from params)
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

  res
    .status(201)
    .json(new ApiResponse(201, placement, "Placement created successfully"));
});

// ✅ Update placement
export const updatePlacementController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const placement = await updatePlacementService(slug, req.body);

  res
    .status(200)
    .json(new ApiResponse(200, placement, "Placement updated successfully"));
});

// ✅ Delete placement
export const deletePlacementController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  await deletePlacementService(slug);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Placement deleted successfully"));
});

export const getPlacementsController = asyncHandler(async (req, res) => {
  // Extract filters from query params. Use default or null if not provided.
  const { slug, branch, year } = req.query;

  // Build a filter object for your service/database query.
  const filter = {};
  if (slug) filter.slug = slug;
  if (branch) filter.branch = branch;
  if (year) filter.year = year;

  // Pass the filter to your service function.
  const placements = await getPlacementsService(filter);

  res
    .status(200)
    .json(new ApiResponse(200, placements, "Placements fetched successfully"));
});

export const getPlacementsByCollegeIdController = asyncHandler(
  async (req, res) => {
    const { slug } = req.params; // assuming collegeId is passed as a URL param

    if (!slug) {
      return res.status(400).json({ message: "slug is required" });
    }

    // Cache key for this slug
    const cacheKey = `placementsBySlug:${slug}`;

    // Try to get cached placements
    let placements = getCache(cacheKey);

    if (!placements) {
      // If not cached, query DB
      placements = await getPlacementsServiceByCollegeId({ slug });

      // Cache the result with default TTL
      setCache(cacheKey, placements);
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, placements, "Placements fetched successfully")
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

    // Pass both slug and year to the service
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
