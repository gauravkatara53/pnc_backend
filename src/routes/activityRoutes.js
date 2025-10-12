import { Router } from "express";
import {
  getRecentActivitiesController,
  getEntityActivitiesController,
  getUserActivitiesController,
  getActivityStatsController,
  getActivityFiltersController,
} from "../controllers/activityController.js";
// Import any middleware you want to use
// import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

/**
 * @route GET /api/activities/recent
 * @desc Get recent activities (default: 5 most recent)
 * @query limit (optional): Number of activities to fetch (1-50, default: 5)
 * @query entityType (optional): Filter by entity type
 * @query action (optional): Filter by action (CREATE, UPDATE, DELETE)
 * @access Public (you can add auth middleware if needed)
 */
router.get("/recent", getRecentActivitiesController);

/**
 * @route GET /api/activities/entity/:entityType/:entityId
 * @desc Get activities for a specific entity
 * @params entityType: Type of entity (e.g., COLLEGE_PROFILE, PLACEMENT)
 * @params entityId: ID of the entity
 * @query limit (optional): Number of activities to fetch (1-50, default: 10)
 * @access Public (you can add auth middleware if needed)
 */
router.get("/entity/:entityType/:entityId", getEntityActivitiesController);

/**
 * @route GET /api/activities/user/:userId
 * @desc Get activities by user
 * @params userId: User ID
 * @query limit (optional): Number of activities to fetch (1-100, default: 20)
 * @access Public (you can add auth middleware if needed)
 */
router.get("/user/:userId", getUserActivitiesController);

/**
 * @route GET /api/activities/stats
 * @desc Get activity statistics
 * @query timeframe (optional): today, week, month, all (default: today)
 * @access Public (you can add auth middleware if needed)
 */
router.get("/stats", getActivityStatsController);

/**
 * @route GET /api/activities/filters
 * @desc Get available filters for activities (entity types, actions, etc.)
 * @access Public
 */
router.get("/filters", getActivityFiltersController);

export default router;
