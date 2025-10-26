// controllers/predictorController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const predictColleges = asyncHandler(async (req, res) => {
  const { rank, examType, seatType, subCategory, homeState, mode } = req.query;
  const parsedRank = parseInt(rank || "0", 10);

  console.log("\n=== Predict Colleges (Enhanced Logic) ===");
  console.log("Input params:", {
    rank: parsedRank,
    examType,
    seatType,
    subCategory,
    homeState,
    mode,
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

  // === EXCLUDED QUOTAS (Never Considered) ===
  const excludedQuotas = [
    "DASA-CIWG",
    "DASA-Non CIWG",
    "Foreign Country Quota",
    "Foreign-Quota",
  ];

  try {
    // 1️⃣ Fetch all rows in batches
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
        .eq("seatType", seatType)
        .eq("subCategory", subCategory)
        .range(from, to);

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

    // 2️⃣ Apply seat type / quota filtering logic
    allData = allData.filter((item) => {
      const quota = (item.quota || "").trim();
      const collegeState = (item.state || "").toLowerCase();
      const userState = (homeState || "").toLowerCase();

      // ❌ Exclude DASA / Foreign quotas
      if (excludedQuotas.includes(quota)) return false;

      // ✅ Always included quotas
      const alwaysIncluded = ["AI", "All India", "OS", "Open Seat Quota"];
      if (alwaysIncluded.includes(quota)) return true;

      // 🏠 Delhi region logic
      if (quota === "Delhi Region" && userState === "delhi") return true;
      if (quota === "Outside Delhi Region" && userState !== "delhi")
        return true;

      // 🏠 Goa specific
      if (quota === "GO" && userState === "goa") return true;

      // 🏠 HS: Home State quota (college.state must match userState)
      if (quota === "HS" && collegeState === userState) return true;

      // 🏠 JK / LA (UT specific)
      if (quota === "JK" && userState === "jammu-and-kashmir") return true;
      if (quota === "LA" && userState === "ladakh") return true;

      // ❌ Everything else excluded
      return false;
    });

    console.log(`✅ Rows after quota filter: ${allData.length}`);

    // 3️⃣ Group by college-course-branch
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

    // 4️⃣ Process each group
    for (const [key, group] of grouped) {
      // Check eligibility
      const eligibleRounds = group.filter(
        (r) =>
          parsedRank <= (r.closingRank ?? Number.MAX_VALUE) &&
          allowedRounds.includes(r.round)
      );

      // If safe mode → must be found in allowedRounds
      if (mode === "safe" && eligibleRounds.length === 0) continue;

      // Choose best matching round
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

      // Calculate scores
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

      // Cutoff Map
      const cutoffMap = {};
      const years = [...new Set(group.map((r) => r.year))];
      years.forEach((year) => {
        cutoffMap[year] = {};

        group
          .filter((r) => {
            // In safe mode, only include rounds starting with "Round-"
            if (mode === "safe") {
              return r.year === year && r.round.startsWith("Round-");
            }
            // In other modes, include all rounds for the year
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

    // Sort by final score descending
    results.sort((a, b) => b.FinalScore - a.FinalScore);

    return res
      .status(200)
      .json(
        new ApiResponse(200, results, "Predictions generated successfully")
      );
  } catch (e) {
    console.error("💥 Unexpected error:", e);
    return res.status(500).json(new ApiResponse(500, null, e.message));
  }
});
