// controllers/predictorController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createClient } from "@supabase/supabase-js";

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

  // --- PAGINATION PARAMETERS ---
  const page = parseInt(req.query.page || "1", 10);
  const pageSize = parseInt(req.query.pageSize || "20", 10);

  // Parse maxFees as number (optional)
  const feesLimit = maxFees ? Number(maxFees) : null;

  console.log("\n=== Predict Colleges (Enhanced Logic) ===");
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

  // === ROUND LOGIC ===
  const safeRounds = [
    "Round-1",
    "Round-2",
    "Round-3",
    "Round-4",
    "Round-5",
    "Round-6",
  ];
  const riskRounds = [
    ...safeRounds,
    "CSAB-1",
    "CSAB-2",
    "CSAB-3",
    "Upgradation-Round",
    "Upgradation-Round-2",
    "Spot-Round",
    "Special-Spot-Round",
  ];
  const allowedRounds = mode === "risk" ? riskRounds : safeRounds;

  // === EXCLUDED QUOTAS ===
  const excludedQuotas = [
    "DASA-CIWG",
    "DASA-Non CIWG",
    "Foreign Country Quota",
    "Foreign-Quota",
  ];

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

  // Derive seatType and subCategory lists
  const seatTypeList = seatTypeGroupMap[seatType] || [seatType];
  const subCategoryList = subCategoryGroupMap[subCategory] || [subCategory];

  try {
    // === FETCH ALL ROWS (BATCHED) ===
    const batchSize = 1000;
    let allData = [];
    let from = 0;
    let to = batchSize - 1;
    let batchCount = 0;

    while (true) {
      let query = supabase
        .from("cutoffs")
        .select("*")
        .eq("examType", examType)
        .in("seatType", seatTypeList)
        .range(from, to);

      // handle subCategory properly
      if (subCategory === "Gender-Neutral") {
        // include NULL subcategories
        query = query.or(
          `subCategory.in.(${subCategoryList.join(",")}),subCategory.is.null`
        );
      } else {
        query = query.in("subCategory", subCategoryList);
      }

      const { data, error } = await query;
      if (error) {
        console.error("❌ Supabase fetch error:", error);
        return res.status(500).json(new ApiResponse(500, null, error.message));
      }

      if (!data || data.length === 0) break;

      allData.push(...data);
      batchCount++;
      console.log(`✅ Batch ${batchCount}: fetched ${data.length} rows`);

      if (data.length < batchSize) break;
      from += batchSize;
      to += batchSize;
    }

    console.log(
      `🎯 Total rows fetched from Supabase: ${allData.length} (in ${batchCount} batches)`
    );

    // === FILTER BASED ON QUOTA & HOME STATE ===
    allData = allData.filter((item) => {
      const quota = (item.quota || "").trim();
      const collegeState = (item.state || "").toLowerCase();
      const userState = (homeState || "").toLowerCase();

      if (excludedQuotas.includes(quota)) return false;

      const alwaysIncluded = [
        "AI",
        "All India",
        "OS",
        "Open Seat Quota",
        "Outside Delhi Region",
      ];
      if (alwaysIncluded.includes(quota)) return true;

      if (quota === "Delhi Region" && userState === "Delhi") return true;
      if (quota === "Outside Delhi Region" && userState !== "Delhi")
        return true;
      if (quota === "GO" && userState === "Goa") return true;
      if (quota === "HS" && collegeState === userState) return true;
      if (quota === "JK" && userState === "jammu-and-kashmir") return true;
      if (quota === "LA" && userState === "ladakh") return true;

      return false;
    });

    console.log(`✅ Rows after quota filter: ${allData.length}`);

    // === GROUP BY COLLEGE-COURSE-BRANCH ===
    const grouped = new Map();
    allData.forEach((item) => {
      const key = `${item.slug}|${item.course}|${item.branch}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    console.log(
      `📦 Total unique college-course-branch groups: ${grouped.size}`
    );

    const results = [];

    // === PROCESS EACH GROUP ===
    for (const [key, group] of grouped) {
      const eligibleRounds = group.filter(
        (r) =>
          parsedRank <= (r.closingRank ?? Number.MAX_VALUE) &&
          allowedRounds.includes(r.round)
      );

      if (mode === "safe" && eligibleRounds.length === 0) continue;

      const firstRound =
        eligibleRounds.sort((a, b) => {
          const aNum = parseInt(a.round.match(/Round-(\d+)/)?.[1] ?? "99");
          const bNum = parseInt(b.round.match(/Round-(\d+)/)?.[1] ?? "99");
          return aNum - bNum;
        })[0] ||
        group
          .filter((r) => parsedRank <= (r.closingRank ?? Number.MAX_VALUE))
          .sort((a, b) => (a.year || 0) - (b.year || 0))[0];

      if (!firstRound) continue;

      const rankScore = Math.max(
        0,
        1 -
          Math.abs(parsedRank - firstRound.closingRank) / firstRound.closingRank
      );
      const branchWeight = firstRound.branch_weight ?? 70;
      const collegeWeight = firstRound.college_weight ?? 70;
      const finalScore =
        rankScore * 0.4 +
        (branchWeight / 100) * 0.3 +
        (collegeWeight / 100) * 0.3;

      const cutoffMap = {};
      const years = [...new Set(group.map((r) => r.year))];
      years.forEach((year) => {
        cutoffMap[year] = {};
        group
          .filter((r) => {
            if (mode === "safe")
              return r.year === year && r.round.startsWith("Round-");
            return r.year === year;
          })
          .forEach((r) => {
            cutoffMap[year][r.round] = Math.round(r.closingRank ?? 0);
          });
      });

      results.push({
        College: firstRound.name,
        Slug: firstRound.slug,
        State: firstRound.state,
        Fees: firstRound.fees,
        AvgSalary: firstRound.avgSalary,
        NIRF: firstRound.nirf,
        NIRFNumber: firstRound.nirf_number,
        Course: firstRound.course,
        Branch: firstRound.branch,
        SeatType: firstRound.seatType,
        SubCategory: firstRound.subCategory,
        Quota: firstRound.quota,
        ExamType: firstRound.examType,
        ClosestRound: firstRound.round,
        BranchWeight: branchWeight,
        CollegeWeight: collegeWeight,
        RankScore: rankScore,
        FinalScore: finalScore,
        CutoffsByYear: cutoffMap,
      });
    }

    console.log(`✅ Total colleges after all filters: ${results.length}`);
    results.sort((a, b) => b.FinalScore - a.FinalScore);

    // === FILTER BY TAG ===
    let filteredByTag = results;
    if (tag) {
      const lowerTag = tag.toLowerCase().trim();
      filteredByTag = results.filter((college) => {
        // slug before dash - e.g. iit-delhi => "iit"
        const slugPrefix = college.Slug.split("-")[0].toLowerCase();
        return slugPrefix === lowerTag;
      });
      console.log(
        `✅ Colleges after tag filter (${tag}): ${filteredByTag.length}`
      );
    }

    // === FILTER BY FEES RANGE (maxFees) ===
    let filteredByFees = filteredByTag;
    if (feesLimit !== null && !isNaN(feesLimit)) {
      filteredByFees = filteredByTag.filter((college) => {
        // If fees is null or not number, treat as infinite (exclude if maxFees applied)
        const feesValue = Number(college.Fees);
        return !isNaN(feesValue) && feesValue <= feesLimit;
      });
      console.log(
        `✅ Colleges after fees filter (<= ${feesLimit}): ${filteredByFees.length}`
      );
    }

    // === USER-SIDE PAGINATION ON FILTERED RESULTS ===
    const totalResults = filteredByFees.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = filteredByFees.slice(startIndex, endIndex);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalResults,
          page,
          pageSize,
          colleges: paginatedResults,
        },
        "Predictions generated successfully"
      )
    );
  } catch (e) {
    console.error("💥 Unexpected error:", e);
    return res.status(500).json(new ApiResponse(500, null, e.message));
  }
});
