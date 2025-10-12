import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  getRecentActivities,
  getEntityActivities,
  getUserActivities,
} from "../services/activityService.js";

/**
 * Get recent activities (default: 5 most recent)
 * GET /api/activities/recent
 */
export const getRecentActivitiesController = asyncHandler(async (req, res) => {
  const { limit = 5, entityType, action } = req.query;

  // Build filter object
  const filter = {};
  if (entityType) filter.entityType = entityType.toUpperCase();
  if (action) filter.action = action.toUpperCase();

  // Validate limit
  const parsedLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 50); // Between 1 and 50

  const activities = await getRecentActivities(parsedLimit, filter);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        activities,
        count: activities.length,
        limit: parsedLimit,
        filters: filter,
      },
      "Recent activities fetched successfully"
    )
  );
});

/**
 * Get activities for a specific entity
 * GET /api/activities/entity/:entityType/:entityId
 */
export const getEntityActivitiesController = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const { limit = 10 } = req.query;

  if (!entityType || !entityId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "EntityType and EntityId are required"));
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

  const activities = await getEntityActivities(
    entityType.toUpperCase(),
    entityId,
    parsedLimit
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        activities,
        count: activities.length,
        entityType: entityType.toUpperCase(),
        entityId,
        limit: parsedLimit,
      },
      "Entity activities fetched successfully"
    )
  );
});

/**
 * Get activities by user
 * GET /api/activities/user/:userId
 */
export const getUserActivitiesController = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  if (!userId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User ID is required"));
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

  const activities = await getUserActivities(userId, parsedLimit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        activities,
        count: activities.length,
        userId,
        limit: parsedLimit,
      },
      "User activities fetched successfully"
    )
  );
});

/**
 * Get activity statistics
 * GET /api/activities/stats
 */
export const getActivityStatsController = asyncHandler(async (req, res) => {
  const { timeframe = "today" } = req.query;

  let dateFilter = {};
  const now = new Date();

  switch (timeframe) {
    case "today":
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      };
      break;
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: weekAgo } };
      break;
    case "month":
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      };
      break;
    default:
      // No date filter for 'all'
      break;
  }

  // Get recent activities with the date filter
  const activities = await getRecentActivities(100, dateFilter);

  // Calculate statistics
  const stats = {
    total: activities.length,
    byAction: {},
    byEntityType: {},
    timeframe,
  };

  activities.forEach((activity) => {
    // Count by action
    stats.byAction[activity.action] =
      (stats.byAction[activity.action] || 0) + 1;

    // Count by entity type
    stats.byEntityType[activity.entityType] =
      (stats.byEntityType[activity.entityType] || 0) + 1;
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, stats, "Activity statistics fetched successfully")
    );
});

/**
 * Get available entity types and actions (for frontend filters)
 * GET /api/activities/filters
 */
export const getActivityFiltersController = asyncHandler(async (req, res) => {
  const filters = {
    entityTypes: [
      { value: "COLLEGE_PROFILE", label: "College Profiles" },
      { value: "PLACEMENT", label: "Placements" },
      { value: "PLACEMENT_STATS", label: "Placement Statistics" },
      { value: "TOP_RECRUITER", label: "Top Recruiters" },
      { value: "NEWS", label: "News Articles" },
      { value: "CUTOFF", label: "Cutoffs" },
      { value: "USER", label: "Users" },
      { value: "COURSE", label: "Courses" },
      { value: "EXAM", label: "Exams" },
    ],
    actions: [
      { value: "CREATE", label: "Created", color: "green" },
      { value: "UPDATE", label: "Updated", color: "blue" },
      { value: "DELETE", label: "Deleted", color: "red" },
    ],
    limits: [5, 10, 20, 50],
  };

  res
    .status(200)
    .json(
      new ApiResponse(200, filters, "Activity filters fetched successfully")
    );
});
