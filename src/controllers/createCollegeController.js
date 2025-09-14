import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import {
  createCollegeService,
  getAllCollegesService,
  getCollegeBySlugService,
} from "../services/createCollegeService.js";
import { imagekit } from "../utils/imageKitClient.js";
import CollegeProfile from "../models/collegeProfileModel.js";

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
  });

  res
    .status(201)
    .json(new ApiResponse(201, college, "College created successfully"));
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
      { image_url: uploadResponse.url },
      { new: true } // return updated document
    );

    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

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

export const getAllCollegeSlugsController = asyncHandler(async (req, res) => {
  const colleges = await CollegeProfile.find({}, "slug");
  const slugs = colleges.map((college) => college.slug);
  res
    .status(200)
    .json(new ApiResponse(200, slugs, "College slugs fetched successfully"));
});
