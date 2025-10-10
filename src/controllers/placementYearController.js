import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import {
  addPlacementYear,
  removePlacementYear,
  getAvailablePlacementYears,
} from "../utils/placementYearUpdater.js";

/**
 * 📅 Add a year to college's availablePlacementReports
 * POST /api/v1/college/:slug/placement-years
 */
export const addPlacementYearController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { year } = req.body;

  if (!year || year < 2000 || year > 2030) {
    throw new ApiError(400, "Valid year is required (2000-2030)");
  }

  const added = await addPlacementYear(slug, parseInt(year));

  if (!added) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { year, alreadyExists: true },
          `Year ${year} already exists in placement reports`
        )
      );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { year, added: true },
        `Year ${year} added to placement reports successfully`
      )
    );
});

/**
 * 📅 Remove a year from college's availablePlacementReports
 * DELETE /api/v1/college/:slug/placement-years/:year
 */
export const removePlacementYearController = asyncHandler(async (req, res) => {
  const { slug, year } = req.params;

  const yearNum = parseInt(year);
  if (!yearNum || yearNum < 2000 || yearNum > 2030) {
    throw new ApiError(400, "Valid year is required (2000-2030)");
  }

  const removed = await removePlacementYear(slug, yearNum);

  if (!removed) {
    return res
      .status(404)
      .json(
        new ApiResponse(
          404,
          { year: yearNum, found: false },
          `Year ${yearNum} not found in placement reports`
        )
      );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { year: yearNum, removed: true },
        `Year ${yearNum} removed from placement reports successfully`
      )
    );
});

/**
 * 📊 Get available placement years for a college
 * GET /api/v1/college/:slug/placement-years
 */
export const getPlacementYearsController = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const years = await getAvailablePlacementYears(slug);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        slug,
        availableYears: years,
        count: years.length,
      },
      "Available placement years fetched successfully"
    )
  );
});
