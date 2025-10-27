import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createClient } from "@supabase/supabase-js";
import { getCache, setCache } from "../utils/nodeCache.js";
import redis from "../libs/redis.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const predictColleges = asyncHandler(async (req, res) => {
  const {
    rank,
    examType,
    seatType,
    subCategory,
    homeState,
    mode,
    tag,
    maxFees,
  } = req.query;

  const parsedRank = parseInt(rank || "0", 10);
  const page = parseInt(req.query.page || "1", 10);
  const pageSize = parseInt(req.query.pageSize || "20", 10);
  const feesLimit = maxFees ? Number(maxFees) : null;

  console.log("\n=== Predict Colleges (PostgreSQL Function) ===");
  console.log("Input params:", {
    rank: parsedRank,
    examType,
    seatType,
    subCategory,
    homeState,
    mode,
    page,
    pageSize,
    tag,
    maxFees,
  });

  // === Cache Key ===
  const cacheKey = `predict:${examType}:${seatType}:${subCategory}:${homeState}:${mode}:${parsedRank}:${page}:${pageSize}:${
    tag || "none"
  }:${feesLimit || "none"}`;
  const TTL_SECONDS = 24 * 60 * 60; // 1 day

  try {
    // -----------------------------
    // 🧠 LAYER 1: NodeCache
    // -----------------------------
    const nodeCached = getCache(cacheKey);
    if (nodeCached) {
      console.log("⚡ NodeCache HIT:", cacheKey);
      return res
        .status(200)
        .json(new ApiResponse(200, nodeCached, "Data from NodeCache"));
    }

    // -----------------------------
    // 🧠 LAYER 2: Redis
    // -----------------------------
    const redisCached = await redis.get(cacheKey);
    if (redisCached) {
      console.log("🔥 Redis HIT:", cacheKey);
      const parsed = JSON.parse(redisCached);
      // also set NodeCache for faster next access
      setCache(cacheKey, parsed, TTL_SECONDS);
      return res
        .status(200)
        .json(new ApiResponse(200, parsed, "Data from Redis Cache"));
    }

    // -----------------------------
    // ❌ CACHE MISS → Fetch from Supabase
    // -----------------------------
    console.log("🛰️ CACHE MISS (Fetching from Supabase):", cacheKey);

    // === SEAT TYPE MAPPING ===
    const seatTypeGroupMap = {
      General: ["General", "GNYes", "OPEN"],
      EWS: ["EWS"],
      OBC: ["OBC", "OBC-NCL"],
      SC: ["SC"],
      ST: ["ST"],
      PwD: [
        "EWS (PwD)",
        "EWS-PwD",
        "EWS PwD",
        "General\nPwD",
        "General-PwD",
        "OBC PwD",
        "OBC-NCL (PwD)",
        "OBC-NCL-PwD",
        "OPEN (PwD)",
        "SC (PwD)",
        "SC PwD",
        "SC-PwD",
        "ST (PwD)",
        "ST PwD",
        "ST-PwD",
      ],
      Other: ["Kashmiri", "Single"],
    };

    // === SUBCATEGORY MAPPING ===
    const subCategoryGroupMap = {
      "Gender-Neutral": ["Gender-Neutral", "Open Seat Quota", "None"],
      Female: ["Female-only", "Girl"],
    };

    const seatTypeList = seatTypeGroupMap[seatType] || [seatType];
    const subCategoryList = subCategoryGroupMap[subCategory] || [subCategory];

    const { data, error } = await supabase.rpc("predict_colleges", {
      p_rank: parsedRank,
      p_exam_type: examType,
      p_seat_types: seatTypeList,
      p_sub_categories: subCategoryList,
      p_home_state: homeState || "",
      p_mode: mode || "safe",
      p_tag: tag || null,
      p_max_fees: feesLimit,
    });

    if (error) {
      console.error("❌ RPC Error:", error);
      return res.status(500).json(new ApiResponse(500, null, error.message));
    }

    console.log(`✅ Function returned ${data?.length || 0} results`);

    // === PAGINATION ===
    const totalResults = data?.length || 0;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = data?.slice(startIndex, endIndex) || [];

    // === FORMAT RESPONSE ===
    const formattedResults = paginatedResults.map((college) => ({
      College: college.college_name,
      Slug: college.slug,
      State: college.state,
      Fees: college.fees,
      AvgSalary: college.avgSalary,
      NIRF: college.nirf,
      NIRFNumber: college.nirf_number,
      Course: college.course,
      Branch: college.branch,
      SeatType: college.seatType,
      SubCategory: college.subCategory,
      Quota: college.quota,
      ExamType: college.examType,
      CutoffsByYear: college.CutoffsByYear,
      FinalScore: parseFloat(college.FinalScore || 0),
    }));

    const responseData = {
      totalResults,
      page,
      pageSize,
      colleges: formattedResults,
    };

    // -----------------------------
    // 💾 SAVE TO BOTH CACHES
    // -----------------------------
    setCache(cacheKey, responseData, TTL_SECONDS); // NodeCache
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", TTL_SECONDS); // Redis

    console.log("🧠 Cached in both Redis & NodeCache:", cacheKey);

    return res
      .status(200)
      .json(
        new ApiResponse(200, responseData, "Predictions generated successfully")
      );
  } catch (e) {
    console.error("💥 Unexpected error:", e);
    return res.status(500).json(new ApiResponse(500, null, e.message));
  }
});
