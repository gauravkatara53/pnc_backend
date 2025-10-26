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

  console.log("=== Predict Colleges ===");
  console.log("Input params:", {
    rank: parsedRank,
    examType,
    seatType,
    subCategory,
    homeState,
    mode,
  });

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

  try {
    // 1️⃣ Fetch all rows from Supabase in batches of 1000
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

      if (homeState) {
        query = query.or(
          `quota.neq.HS,and(quota.eq.HS,state.ilike.${homeState.toLowerCase()})`
        );
      }

      const { data, error } = await query;
      if (error) {
        console.error("Supabase fetch error:", error);
        return res.status(500).json(new ApiResponse(500, null, error.message));
      }

      if (!data || data.length === 0) break;

      allData = [...allData, ...data];
      batchCount++;
      console.log(`✅ Batch ${batchCount}: fetched ${data.length} rows`);

      // Stop if fetched less than batchSize → no more data left
      if (data.length < batchSize) break;

      // Move to next batch
      from += batchSize;
      to += batchSize;
    }

    console.log(
      `🎯 Total rows fetched from Supabase: ${allData.length} (in ${batchCount} batches)`
    );

    // 2️⃣ Group by college-course-branch
    const grouped = new Map();
    allData.forEach((item) => {
      const key = `${item.slug}|${item.course}|${item.branch}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });
    console.log(`Total unique college-course-branch groups: ${grouped.size}`);

    const results = [];

    for (const [key, group] of grouped) {
      const anyEligible = group.some(
        (r) => parsedRank <= (r.closingRank ?? Number.MAX_VALUE)
      );
      if (!anyEligible) continue;

      const firstRound =
        group
          .filter(
            (r) =>
              parsedRank <= (r.closingRank ?? Number.MAX_VALUE) &&
              allowedRounds.includes(r.round)
          )
          .sort((a, b) => {
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
          .filter((r) => r.year === year)
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

    console.log(
      `✅ Total colleges after eligibility filter: ${results.length}`
    );

    results.sort((a, b) => b.FinalScore - a.FinalScore);

    return res
      .status(200)
      .json(
        new ApiResponse(200, results, "Predictions generated successfully")
      );
  } catch (e) {
    console.error("Unexpected error:", e);
    return res.status(500).json(new ApiResponse(500, null, e.message));
  }
});
