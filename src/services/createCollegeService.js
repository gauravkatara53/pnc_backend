import CollegeProfile from "../models/collegeProfileModel.js";
import { deleteCacheByPrefix, getCache, setCache } from "../utils/nodeCache.js";
import mongoose from "mongoose";
export const createCollegeService = async ({
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
  cutoffTrends,
  instituteFeeStructure,
  hostelFeeStructure,
  waiver,
  placementAnalytics,
  campusFacilities,
  rankings,
  AlsoKnownAs,
}) => {
  const college = await CollegeProfile.create({
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
    cutoffTrends,
    instituteFeeStructure,
    hostelFeeStructure,
    waiver,
    placementAnalytics,
    campusFacilities,
    rankings,
    AlsoKnownAs,
  });

  // Clear cache after new entry
  deleteCacheByPrefix("colleges:");

  return college;
};

export const getCollegeBySlugService = async (slug) => {
  if (!slug || typeof slug !== "string") {
    throw new Error("Invalid college slug");
  }

  const cacheKey = `college:slug:${slug}`;

  // Try cache first
  let college = getCache(cacheKey);
  if (college) return college;

  // Use lean() → plain object
  college = await CollegeProfile.findOne({ slug }).lean();
  if (!college) throw new Error("College not found");

  setCache(cacheKey, college); // safe
  return college;
};

// ✅ Get all colleges with filters + caching

export const getAllCollegesService = async (filters, page, limit) => {
  const cacheKey = `colleges:${JSON.stringify(
    filters
  )}:page=${page}:limit=${limit}`;

  let cachedResult = getCache(cacheKey);
  if (cachedResult) return cachedResult;

  const query = {};

  // Search term filter
  if (filters.searchTerm) {
    const searchRegex = new RegExp(filters.searchTerm, "i");
    query.$or = [
      { name: { $regex: searchRegex } },
      { fullNames: { $regex: searchRegex } },
      { slug: { $regex: searchRegex } },
      { AlsoKnownAs: { $regex: searchRegex } },
    ];
  }

  // Multi-value filters
  if (filters.state) {
    query.state = { $in: filters.state.split(",") };
  }
  if (filters.instituteType) {
    query.instituteType = { $in: filters.instituteType.split(",") };
  }
  if (filters.tag) {
    query.tag = { $in: filters.tag.split(",") };
  }
  if (filters.stream) {
    query.stream = { $in: filters.stream.split(",") }; // ✅ fixed lowercase field
  }

  // Range filters
  if (filters.minFees) query.fees = { $gte: Number(filters.minFees) };
  if (filters.maxFees)
    query.fees = { ...(query.fees || {}), $lte: Number(filters.maxFees) };
  if (filters.minPlacementRate)
    query.placementRate = { $gte: Number(filters.minPlacementRate) };

  // Sorting
  let sort = {};
  if (filters.sortBy) {
    const order = filters.order === "desc" ? -1 : 1;
    sort[filters.sortBy] = order;
  }

  const skip = (page - 1) * limit;

  // Fields to return
  const projection = {
    name: 1,
    slug: 1,
    image_url: 1,
    fees: 1,
    avgSalary: 1,
    nirf: 1,
    placementRate: 1,
    instituteType: 1,
    tag: 1,
    establishedYear: 1,
    location: 1,
    address: 1,
    state: 1,
    country: 1,
    pincode: 1,
    examType: 1,
    AlsoKnownAs: 1,
    stream: 1,
  };

  // Fetch total count for pagination
  const totalCount = await CollegeProfile.countDocuments(query);

  // Fetch paginated results with only needed fields
  const colleges = await CollegeProfile.find(query, projection)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const result = { colleges, totalCount };
  setCache(cacheKey, result);

  return result;
};
