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

  // Add searchTerm filter to search by name, fullNames, slug, AlsoKnownAs
  if (filters.searchTerm) {
    const searchRegex = new RegExp(filters.searchTerm, "i");
    query.$or = [
      { name: { $regex: searchRegex } },
      { fullNames: { $regex: searchRegex } },
      { slug: { $regex: searchRegex } },
      { AlsoKnownAs: { $regex: searchRegex } },
    ];
  }

  // Support comma separated list filtering for multi-value filters
  if (filters.state) {
    const states = filters.state.split(",");
    query.state = { $in: states };
  }
  if (filters.instituteType) {
    const types = filters.instituteType.split(",");
    query.instituteType = { $in: types };
  }
  if (filters.tag) {
    const tags = filters.tag.split(",");
    query.tag = { $in: tags };
  }
  if (filters.Stream) {
    const streams = filters.Stream.split(",");
    query.Stream = { $in: streams };
  }
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

  // Fetch total count for pagination
  const totalCount = await CollegeProfile.countDocuments(query);

  // Fetch paginated results
  const colleges = await CollegeProfile.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const result = { colleges, totalCount };
  setCache(cacheKey, result);

  return result;
};
