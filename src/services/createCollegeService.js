import CollegeProfile from "../models/collegeProfileModel.js";
import { deleteCacheByPrefix, getCache, setCache } from "../utils/nodeCache.js";
import redis from "../libs/redis.js";

// Helper function to clear college-related caches from service
const clearCollegeRelatedCachesFromService = async (slug = null) => {
  try {
    console.log("🧹 Clearing college-related caches from service...");

    // Clear NodeCache patterns
    deleteCacheByPrefix("colleges:"); // Clear all college list caches

    // Clear Redis patterns
    const redisKeys = await redis.keys("college*");
    if (redisKeys.length > 0) {
      await redis.del(...redisKeys);
      console.log(
        `🧹 Cleared ${redisKeys.length} Redis keys with pattern college*`
      );
    }

    console.log("✅ College-related caches cleared successfully from service");
  } catch (error) {
    console.error("❌ Error clearing college caches from service:", error);
  }
};

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
  stream,
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
    stream,
  });

  // Clear college-related caches since new college affects lists
  await clearCollegeRelatedCachesFromService(slug);

  return college;
};

export const getCollegeBySlugService = async (slug) => {
  if (!slug || typeof slug !== "string") {
    throw new Error("Invalid college slug");
  }

  const cacheKey = `college:slug:${slug}`;

  // 1. Try Node-cache (L1)
  let college = getCache(cacheKey);
  if (college) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return college; // already JS object
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    college = JSON.parse(cachedRedis);

    // Save into Node-cache for next time (super-fast hit)
    setCache(cacheKey, college);

    return college;
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  college = await CollegeProfile.findOne({ slug }).lean();
  if (!college) throw new Error("College not found");

  // Save into both caches
  setCache(cacheKey, college); // L1 (node-cache)
  await redis.set(cacheKey, JSON.stringify(college), "EX", 600); // L2 (5 mins TTL)

  console.log("✅ Cached in Node-cache + Redis:", cacheKey);

  return college;
};

// ✅ Get all colleges with filters + caching

export const getAllCollegesService = async (filters, page, limit) => {
  const cacheKey = `colleges:${JSON.stringify(
    filters
  )}:page=${page}:limit=${limit}`;

  // 1. Try Node-cache (L1, ~1 minute)
  let cachedResult = getCache(cacheKey);
  if (cachedResult) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return cachedResult;
  }

  // 2. Try Redis (L2, 10 minutes)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    const parsed = JSON.parse(cachedRedis);

    // Put into Node-cache (1 min TTL by default)
    setCache(cacheKey, parsed);

    return parsed;
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  const query = {};

  // Search filter
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
  if (filters.state) query.state = { $in: filters.state.split(",") };
  if (filters.instituteType)
    query.instituteType = { $in: filters.instituteType.split(",") };
  if (filters.tag) query.tag = { $in: filters.tag.split(",") };
  if (filters.stream) query.stream = { $in: filters.stream.split(",") };
  if (filters.examType) query.examType = { $in: filters.examType.split(",") };

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

  // Projection
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

  // Count
  const totalCount = await CollegeProfile.countDocuments(query);

  // Results
  const colleges = await CollegeProfile.find(query, projection)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const result = { colleges, totalCount };

  // Save to both caches
  setCache(cacheKey, result); // Node-cache (~1 min, default TTL)
  await redis.set(cacheKey, JSON.stringify(result), "EX", 600); // Redis (10 min)

  console.log("✅ Cached in Node-cache + Redis:", cacheKey);

  return result;
};
