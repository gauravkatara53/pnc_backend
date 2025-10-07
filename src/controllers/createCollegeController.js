import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import {
  createCollegeService,
  getAllCollegesService,
  getCollegeBySlugService,
} from "../services/createCollegeService.js";
import { imagekit } from "../utils/imageKitClient.js";
import CollegeProfile from "../models/collegeProfileModel.js";
import redis from "../libs/redis.js";
import { deleteCacheByPrefix, deleteCache } from "../utils/nodeCache.js";

// Helper function to clear college-related caches
const clearCollegeRelatedCaches = async (slug = null) => {
  try {
    console.log("🧹 Clearing college-related caches...");

    // Clear NodeCache patterns
    deleteCacheByPrefix("colleges:"); // Clear all college list caches

    if (slug) {
      deleteCache(`college:slug:${slug}`); // Clear specific college cache
      console.log(`🧹 Cleared specific college cache: college:slug:${slug}`);
    }

    // Clear Redis patterns
    const redisKeys = await redis.keys("college*");
    if (redisKeys.length > 0) {
      await redis.del(...redisKeys);
      console.log(
        `🧹 Cleared ${redisKeys.length} Redis keys with pattern college*`
      );
    }

    console.log("✅ College-related caches cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing college caches:", error);
  }
};

export const createCollegeController = asyncHandler(async (req, res) => {
  const {
    name,
    slug,
    bio,
    fullNames,
    image_url,
    fees,
    avgSalary,
    nirf,
    highestPackage,
    placementRate,
    instituteType,
    establishedYear,
    tag,
    examType,
    location,
    address,
    state,
    country,
    pincode,
    addressConnectivity,
    admissionCriteria,
    coursesOffered,
    seatsAvailable,
    instituteFeeStructure,
    hostelFeeStructure,
    waiver,
    placementAnalytics,
    campusFacilities,
    rankings,
    AlsoKnownAs,
    stream,
  } = req.body;

  const college = await createCollegeService({
    name,
    slug,
    bio,
    fullNames,
    image_url,
    fees,
    avgSalary,
    nirf,
    highestPackage,
    placementRate,
    instituteType,
    establishedYear,
    tag,
    examType,
    location,
    address,
    state,
    country,
    pincode,
    addressConnectivity,
    admissionCriteria,
    coursesOffered,
    seatsAvailable,
    instituteFeeStructure,
    hostelFeeStructure,
    waiver,
    placementAnalytics,
    campusFacilities,
    rankings,
    AlsoKnownAs,
    stream,
  });

  // Clear college-related caches since new college affects lists
  await clearCollegeRelatedCaches(slug);

  res
    .status(201)
    .json(new ApiResponse(201, college, "College created successfully"));
});

export const updateCollegeProfileController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const updateData = req.body;

  // Find and update the college profile by slug
  const updatedCollege = await CollegeProfile.findOneAndUpdate(
    { slug },
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedCollege) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "College not found"));
  }

  // Clear college-related caches since update affects lists and specific college
  await clearCollegeRelatedCaches(slug);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedCollege,
        "College profile updated successfully"
      )
    );
});

// ✅ Get single college by ID
export const getCollegeBySlugController = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const college = await getCollegeBySlugService(slug);

  res
    .status(200)
    .json(new ApiResponse(200, college, "College fetched successfully"));
});

// ✅ Get all colleges with filters
export const getAllCollegesController = asyncHandler(async (req, res) => {
  const filters = req.query; // query params for filtering
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;

  // Remove pagination params from filters before passing to service
  delete filters.page;
  delete filters.limit;

  const { colleges, totalCount } = await getAllCollegesService(
    filters,
    page,
    limit
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { colleges, totalCount },
        "Colleges fetched successfully"
      )
    );
});

// Controller: Upload profile picture for a college
export const uploadCollegeProfilePic = async (req, res) => {
  try {
    const { slug } = req.params;

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

    // Update college profile with new image URL using slug
    const college = await CollegeProfile.findOneAndUpdate(
      { slug },
      { image_url: uploadResponse.url },
      { new: true } // return updated document
    );

    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    // Clear college-related caches since profile image update affects display
    await clearCollegeRelatedCaches(slug);

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
};

// controller for the placement analytics

export const uploadPlacementAnalytics = async (req, res) => {
  try {
    const { collegeId } = req.params;

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

    // Update college profile with new image URL
    const college = await CollegeProfile.findByIdAndUpdate(
      collegeId,
      { placementAnalytics_url: uploadResponse.url },
      { new: true } // return updated document
    );

    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    // Clear college-related caches since placement analytics update affects display
    await clearCollegeRelatedCaches(college.slug);

    res.status(200).json({
      success: true,
      message: "Placement analytics uploaded successfully",
      placementAnalytics_url: uploadResponse.url,
      college,
    });
  } catch (err) {
    console.error("Error uploading placement analytics:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const deleteCollegeController = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  // Find and delete the college by slug
  const college = await CollegeProfile.findOneAndDelete({ slug });
  if (!college) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "College not found."));
  }

  // Clear all college-related caches since deletion affects lists
  await clearCollegeRelatedCaches(slug);

  res
    .status(200)
    .json(new ApiResponse(200, null, "College deleted successfully"));
});

export const getAllCollegeSlugsController = asyncHandler(async (req, res) => {
  const colleges = await CollegeProfile.find({}, "slug");
  const slugs = colleges.map((college) => college.slug);
  res
    .status(200)
    .json(new ApiResponse(200, slugs, "College slugs fetched successfully"));
});

export const clearAllCacheController = asyncHandler(async (req, res) => {
  // Clear all college-related caches
  await clearCollegeRelatedCaches();

  res
    .status(200)
    .json(new ApiResponse(200, null, "College caches cleared successfully"));
});
