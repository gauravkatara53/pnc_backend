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

import {
  setCache,
  getCache,
  deleteCacheByPrefix,
  deleteCache,
} from "../utils/nodeCache.js";
import PlacementStats from "../models/placementStatsModel.js";
import TopRecruiters from "../models/topRecuritermodel.js";
import { imagekit } from "../utils/imageKitClient.js";
import { autoUpdatePlacementYear } from "../utils/placementYearUpdater.js";
import {
  clearRelatedCaches,
  clearPlacementCaches,
} from "../utils/cacheManager.js";

// Helper function to clear placement-related caches (legacy - use clearPlacementCaches instead)
const clearPlacementRelatedCaches = async (slug = null) => {
  await clearPlacementCaches(slug);
};

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

  // Validate required fields
  if (!slug) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "College slug is required"));
  }

  if (!year) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Year is required in placement data"));
  }

  const placement = await createPlacementService(slug, {
    branch,
    placementPercentage,
    medianPackageLPA,
    highestPackageLPA,
    averagePackageLPA,
    year,
  });

  // Note: autoUpdatePlacementYear is now called inside createPlacementService
  // and will throw an error if it fails, which will be caught by asyncHandler

  // Clear placement-related caches since new placement affects lists and stats
  await clearPlacementRelatedCaches(slug);

  res
    .status(201)
    .json(new ApiResponse(201, placement, "Placement created successfully"));
});

// ✅ Bulk create placements
export const bulkCreatePlacementController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const placementsArray = req.body; // Expecting an array of placement objects

  if (!slug) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "College slug is required"));
  }

  if (!Array.isArray(placementsArray) || placementsArray.length === 0) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, "Request body must be a non-empty array")
      );
  }

  // Validate that all placements have year field
  for (let i = 0; i < placementsArray.length; i++) {
    const placement = placementsArray[i];
    if (!placement.year) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            `Year is required for placement at index ${i}`
          )
        );
    }
  }

  const createdPlacements = await Promise.all(
    placementsArray.map((placement) => createPlacementService(slug, placement))
  );

  // Note: autoUpdatePlacementYear is now called inside createPlacementService for each placement
  // and will throw an error if it fails, which will be caught by asyncHandler

  // Clear placement-related caches since bulk creation affects lists and stats
  await clearPlacementRelatedCaches(slug);

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
  const { id } = req.params;
  const placement = await updatePlacementService(id, req.body);

  // Clear placement-related caches since update affects lists and stats
  await clearPlacementRelatedCaches();

  res
    .status(200)
    .json(new ApiResponse(200, placement, "Placement updated successfully"));
});

// ✅ Delete placement
export const deletePlacementController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deletePlacementService(id);

  // Clear placement-related caches since deletion affects lists and stats
  await clearPlacementRelatedCaches();

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

  // Validate required fields
  if (!slug) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "College slug is required"));
  }

  if (!year) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, "Year is required in placement stats data")
      );
  }

  const placementStats = await createPlacementStatsService(slug, {
    year,
    totalOffers,
    highestPackage,
    averagePackage,
    recruiters,
    graph_url,
  });

  // Note: autoUpdatePlacementYear is now called inside createPlacementStatsService
  // and will throw an error if it fails, which will be caught by asyncHandler

  // Clear placement-related caches since new stats affect displays
  await clearPlacementRelatedCaches(slug);

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

// upload image
export const uploadPlacementStatsGraphController = asyncHandler(
  async (req, res) => {
    try {
      const { _id } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded!" });
      }

      // Generate a unique filename
      const fileName = `${Date.now()}-${req.file.originalname}`;

      // Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: req.file.buffer, // Multer memory buffer
        fileName,
        folder: "/college-profiles", // 👈 organized folder
        useUniqueFileName: true,
      });

      // Update college profile with new image URL using _id
      const college = await PlacementStats.findOneAndUpdate(
        { _id },
        { graph_url: uploadResponse.url },
        { new: true } // return updated document
      );

      if (!college) {
        return res.status(404).json({ message: "College not found" });
      }

      // Clear placement-related caches since profile update affects placement display
      await clearPlacementRelatedCaches();

      res.status(200).json({
        success: true,
        message: "Profile picture uploaded successfully",
        imageUrl: uploadResponse.url,
        college,
      });
    } catch (err) {
      console.error("Error uploading college profile pic:", err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

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

  // Validate required fields
  if (!slug) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "College slug is required"));
  }

  if (!year) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, "Year is required in top recruiter data")
      );
  }

  const topRecruiter = await createTopRecruiterService(slug, {
    year,
    totalRecruiters,
    ppo,
    average,
    risePlacement,
    bannerImage,
    recruiters,
  });

  // Note: autoUpdatePlacementYear is now called inside createTopRecruiterService
  // and will throw an error if it fails, which will be caught by asyncHandler

  // Clear placement-related caches since new top recruiter data affects displays
  await clearPlacementRelatedCaches(slug);

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

export const getAllPlacementStatsController = asyncHandler(async (req, res) => {
  const { slug, year } = req.query;

  // Build filter object
  const filter = {};
  if (slug) filter.slug = slug;
  if (year) filter.year = year;

  // Directly query the PlacementStats model (assuming you have it imported)
  const placementStats = await PlacementStats.find(filter);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        placementStats,
        "All placement stats fetched successfully"
      )
    );
});

export const deletePlacementStatsController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await PlacementStats.findByIdAndDelete(id);

  if (!deleted) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Placement stats not found"));
  }

  // Invalidate cache for placement stats of this college
  if (deleted.slug) {
    deleteCacheByPrefix(`placementStats:${deleted.slug}`);
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Placement stats deleted successfully"));
});

export const updatePlacementStatsController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const updated = await PlacementStats.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Placement stats not found"));
  }

  // Invalidate cache for placement stats of this college
  if (updated.slug) {
    deleteCacheByPrefix(`placementStats:${updated.slug}`);
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updated, "Placement stats updated successfully")
    );
});

export const getAllTopRecruitersController = asyncHandler(async (req, res) => {
  const { slug, year } = req.query;

  // Build filter object
  const filter = {};
  if (slug) filter.slug = slug;
  if (year) filter.year = Number(year);

  // Directly query the TopRecruiters model (assuming you have it imported)
  const topRecruiters = await TopRecruiters.find(filter);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        topRecruiters,
        "All top recruiters fetched successfully"
      )
    );
});

export const deleteTopRecruiterController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await TopRecruiters.findByIdAndDelete(id);

  if (!deleted) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Top recruiter not found"));
  }

  // Invalidate cache for top recruiters of this college
  if (deleted.slug) {
    deleteCacheByPrefix(`topRecruiters:${deleted.slug}`);
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Top recruiter deleted successfully"));
});

export const updateTopRecruiterController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const updated = await TopRecruiters.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Top recruiter not found"));
  }

  // Invalidate cache for top recruiters of this college
  if (updated.slug) {
    deleteCacheByPrefix(`topRecruiters:${updated.slug}`);
  }

  res
    .status(200)
    .json(new ApiResponse(200, updated, "Top recruiter updated successfully"));
});
