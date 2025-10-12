import ActivityLog from "../models/activityLogModel.js";
import { setCache, getCache, deleteCacheByPrefix } from "../utils/nodeCache.js";
import redis from "../libs/redis.js";

/**
 * Log an activity to the database
 * @param {Object} activityData - The activity data to log
 * @returns {Promise<Object>} - The created activity log
 */
export const logActivity = async (activityData) => {
  try {
    const {
      action,
      entityType,
      entityId,
      entityName,
      description,
      changes = null,
      userId = null,
      userEmail = null,
      metadata = {},
      ipAddress = null,
      userAgent = null,
    } = activityData;

    // Validate required fields
    if (!action || !entityType || !entityId || !entityName || !description) {
      throw new Error("Missing required fields for activity logging");
    }

    // Create activity log entry
    const activityLog = new ActivityLog({
      action,
      entityType,
      entityId,
      entityName,
      description,
      changes,
      userId,
      userEmail,
      metadata,
      ipAddress,
      userAgent,
    });

    const savedActivity = await activityLog.save();

    // Clear recent activities cache since we have a new activity
    await clearRecentActivitiesCache();

    console.log(`✅ Activity logged: ${action} ${entityType} - ${entityName}`);
    return savedActivity;
  } catch (error) {
    console.error("❌ Error logging activity:", error.message);
    // Don't throw error here as we don't want activity logging to break main operations
    return null;
  }
};

/**
 * Get recent activities from the database
 * @param {number} limit - Number of activities to fetch (default: 5)
 * @param {Object} filter - Optional filter criteria
 * @returns {Promise<Array>} - Array of recent activities
 */
export const getRecentActivities = async (limit = 5, filter = {}) => {
  try {
    const cacheKey = `recentActivities:${limit}:${JSON.stringify(filter)}`;

    // 1. Try NodeCache (L1)
    let activities = getCache(cacheKey);
    if (activities) {
      console.log("⚡ L1 NodeCache hit:", cacheKey);
      return activities;
    }

    // 2. Try Redis (L2)
    const cachedRedis = await redis.get(cacheKey);
    if (cachedRedis) {
      console.log("⚡ L2 Redis hit:", cacheKey);
      activities = JSON.parse(cachedRedis);

      // Refill NodeCache for faster local hits
      setCache(cacheKey, activities, 300); // 5 min TTL
      return activities;
    }

    // 3. Cache miss → Fetch from DB
    console.log("❌ Cache miss (DB fetch):", cacheKey);

    const query = { ...filter };

    activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(limit)
      .lean(); // Use lean() for better performance

    // Add formatted time for frontend
    activities = activities.map((activity) => ({
      ...activity,
      timeAgo: getTimeAgo(activity.createdAt),
      formattedDate: new Date(activity.createdAt).toLocaleString(),
    }));

    // Save into both caches
    setCache(cacheKey, activities, 300); // NodeCache (5 min)
    await redis.set(cacheKey, JSON.stringify(activities), "EX", 600); // Redis (10 min)

    console.log("✅ Cached recent activities in L1 + L2:", cacheKey);

    return activities;
  } catch (error) {
    console.error("❌ Error fetching recent activities:", error.message);
    throw error;
  }
};

/**
 * Get activities for a specific entity
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of the entity
 * @param {number} limit - Number of activities to fetch
 * @returns {Promise<Array>} - Array of activities for the entity
 */
export const getEntityActivities = async (entityType, entityId, limit = 10) => {
  try {
    const cacheKey = `entityActivities:${entityType}:${entityId}:${limit}`;

    // Try cache first
    let activities = getCache(cacheKey);
    if (activities) {
      return activities;
    }

    activities = await ActivityLog.find({
      entityType,
      entityId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Add formatted time
    activities = activities.map((activity) => ({
      ...activity,
      timeAgo: getTimeAgo(activity.createdAt),
      formattedDate: new Date(activity.createdAt).toLocaleString(),
    }));

    setCache(cacheKey, activities, 600); // Cache for 10 minutes
    return activities;
  } catch (error) {
    console.error("❌ Error fetching entity activities:", error.message);
    throw error;
  }
};

/**
 * Get activities by user
 * @param {string} userId - User ID
 * @param {number} limit - Number of activities to fetch
 * @returns {Promise<Array>} - Array of user activities
 */
export const getUserActivities = async (userId, limit = 20) => {
  try {
    const activities = await ActivityLog.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return activities.map((activity) => ({
      ...activity,
      timeAgo: getTimeAgo(activity.createdAt),
      formattedDate: new Date(activity.createdAt).toLocaleString(),
    }));
  } catch (error) {
    console.error("❌ Error fetching user activities:", error.message);
    throw error;
  }
};

/**
 * Clear recent activities cache
 */
const clearRecentActivitiesCache = async () => {
  try {
    // Clear NodeCache
    deleteCacheByPrefix("recentActivities:");
    deleteCacheByPrefix("entityActivities:");

    // Clear Redis cache
    const redisKeys = await redis.keys("recentActivities:*");
    const entityKeys = await redis.keys("entityActivities:*");

    if (redisKeys.length > 0) {
      await redis.del(...redisKeys);
    }
    if (entityKeys.length > 0) {
      await redis.del(...entityKeys);
    }

    console.log("🧹 Cleared recent activities cache");
  } catch (error) {
    console.error("❌ Error clearing activities cache:", error.message);
  }
};

/**
 * Get human readable time ago string
 * @param {Date} date - The date to convert
 * @returns {string} - Human readable time ago
 */
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now.getTime() - new Date(date).getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
};

/**
 * Helper functions to log specific types of activities
 */

// Log college profile activities
export const logCollegeActivity = async (
  action,
  college,
  changes = null,
  userInfo = {}
) => {
  return await logActivity({
    action,
    entityType: "COLLEGE_PROFILE",
    entityId: college._id || college.slug,
    entityName: college.name || college.fullNames,
    description: `${
      action.toLowerCase() === "create"
        ? "Created"
        : action.toLowerCase() === "update"
        ? "Updated"
        : "Deleted"
    } college profile: ${college.name || college.fullNames}`,
    changes,
    ...userInfo,
  });
};

// Log placement activities
export const logPlacementActivity = async (
  action,
  placement,
  collegeName,
  changes = null,
  userInfo = {}
) => {
  return await logActivity({
    action,
    entityType: "PLACEMENT",
    entityId: placement._id,
    entityName: `${collegeName} - ${placement.branch} (${placement.year})`,
    description: `${
      action.toLowerCase() === "create"
        ? "Added"
        : action.toLowerCase() === "update"
        ? "Updated"
        : "Deleted"
    } placement data for ${collegeName} - ${placement.branch} (${
      placement.year
    })`,
    changes,
    ...userInfo,
  });
};

// Log news activities
export const logNewsActivity = async (
  action,
  news,
  changes = null,
  userInfo = {}
) => {
  return await logActivity({
    action,
    entityType: "NEWS",
    entityId: news._id,
    entityName: news.title,
    description: `${
      action.toLowerCase() === "create"
        ? "Published"
        : action.toLowerCase() === "update"
        ? "Updated"
        : "Deleted"
    } news article: ${news.title}`,
    changes,
    ...userInfo,
  });
};

// Log cutoff activities
export const logCutoffActivity = async (
  action,
  cutoff,
  changes = null,
  userInfo = {}
) => {
  return await logActivity({
    action,
    entityType: "CUTOFF",
    entityId: cutoff._id,
    entityName: `${cutoff.collegeName || "Unknown College"} - ${
      cutoff.category || cutoff.round
    }`,
    description: `${
      action.toLowerCase() === "create"
        ? "Added"
        : action.toLowerCase() === "update"
        ? "Updated"
        : "Deleted"
    } cutoff data for ${cutoff.collegeName || "Unknown College"}`,
    changes,
    ...userInfo,
  });
};

export default {
  logActivity,
  getRecentActivities,
  getEntityActivities,
  getUserActivities,
  logCollegeActivity,
  logPlacementActivity,
  logNewsActivity,
  logCutoffActivity,
};
