import { deleteCacheByPrefix, deleteCache } from "./nodeCache.js";
import redis from "../libs/redis.js";

/**
 * 🧹 Comprehensive Cache Management Utility
 * Centralized cache clearing for all modules with proper pattern matching
 */

// Cache patterns for different modules
const CACHE_PATTERNS = {
  // College-related caches
  COLLEGES: {
    LIST: "colleges:*",
    SINGLE: "college:*",
    SEARCH: "college-search:*",
    FILTERS: "college-filters:*",
  },

  // Placement-related caches
  PLACEMENTS: {
    LIST: "placements:*",
    STATS: "placementStats:*",
    RECRUITERS: "topRecruiters:*",
    COLLEGE: "placement:college:*",
  },

  // News-related caches
  NEWS: {
    LIST: "news:list:*",
    SINGLE: "news:slug:*",
    TRENDING: "news:trending:*",
    RELATED: "news:related:*",
  },

  // Cutoff-related caches
  CUTOFFS: {
    LIST: "cutoffs:*",
    FILTERS: "cutoff-filters:*",
  },

  // Dashboard caches
  DASHBOARD: {
    STATS: "dashboard:*",
  },
};

/**
 * Clear caches by module and specific patterns
 */
export const clearModuleCaches = async (module, specificKey = null) => {
  try {
    console.log(
      `🧹 Clearing ${module} caches${specificKey ? ` for: ${specificKey}` : ""}`
    );

    const patterns = CACHE_PATTERNS[module.toUpperCase()];
    if (!patterns) {
      console.warn(`⚠️ Unknown cache module: ${module}`);
      return;
    }

    // Clear NodeCache patterns
    let nodeClearCount = 0;
    Object.values(patterns).forEach((pattern) => {
      const cleared = deleteCacheByPrefix(pattern);
      nodeClearCount += cleared;
    });

    // Clear specific key if provided
    if (specificKey) {
      Object.values(patterns).forEach((pattern) => {
        // Replace wildcards with specific key
        const specificPattern = pattern.replace("*", specificKey);
        const cleared = deleteCache(specificPattern);
        if (cleared) {
          nodeClearCount++;
          console.log(`🗑️ Cleared specific NodeCache key: ${specificPattern}`);
        }
      });
    }

    // Clear Redis caches
    let redisClearCount = 0;
    for (const pattern of Object.values(patterns)) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        redisClearCount += keys.length;
        console.log(
          `🗑️ Redis: Cleared ${keys.length} keys for pattern: ${pattern}`
        );
      }
    }

    // Clear specific Redis keys if provided
    if (specificKey) {
      for (const pattern of Object.values(patterns)) {
        const specificPattern = pattern.replace("*", specificKey);
        const deleted = await redis.del(specificPattern);
        if (deleted > 0) {
          redisClearCount++;
          console.log(`🗑️ Cleared specific Redis key: ${specificPattern}`);
        }
      }
    }

    console.log(
      `✅ ${module} cache clearing completed: NodeCache(${nodeClearCount}), Redis(${redisClearCount})`
    );
  } catch (error) {
    console.error(`❌ Error clearing ${module} caches:`, error.message);
  }
};

/**
 * Clear college-related caches
 */
export const clearCollegeCaches = async (collegeSlug = null) => {
  await clearModuleCaches("colleges", collegeSlug);

  // Also clear related placement data for this college
  if (collegeSlug) {
    const placementKeys = [
      `placement:college:${collegeSlug}`,
      `placementStats:college:${collegeSlug}`,
      `topRecruiters:${collegeSlug}:*`,
    ];

    for (const key of placementKeys) {
      deleteCache(key);
      await redis.del(key);
    }
    console.log(
      `🧹 Cleared college-specific placement caches for: ${collegeSlug}`
    );
  }
};

/**
 * Clear placement-related caches
 */
export const clearPlacementCaches = async (collegeSlug = null, year = null) => {
  await clearModuleCaches("placements", collegeSlug);

  // Clear year-specific caches if provided
  if (year) {
    const yearPatterns = [`*:${year}`, `*${year}*`];
    for (const pattern of yearPatterns) {
      deleteCacheByPrefix(pattern);
      const redisKeys = await redis.keys(pattern);
      if (redisKeys.length > 0) {
        await redis.del(...redisKeys);
        console.log(`🗑️ Cleared year-specific caches for: ${year}`);
      }
    }
  }
};

/**
 * Clear news-related caches
 */
export const clearNewsCaches = async (newsSlug = null) => {
  await clearModuleCaches("news", newsSlug);
};

/**
 * Clear cutoff-related caches
 */
export const clearCutoffCaches = async (collegeSlug = null) => {
  await clearModuleCaches("cutoffs", collegeSlug);
};

/**
 * Clear dashboard caches
 */
export const clearDashboardCaches = async () => {
  await clearModuleCaches("dashboard");
};

/**
 * Clear all caches (use with caution)
 */
export const clearAllCaches = async () => {
  try {
    console.log(
      "🧹 CLEARING ALL CACHES - This will impact performance temporarily"
    );

    // Clear all NodeCache
    const { flushCache } = await import("./nodeCache.js");
    flushCache();

    // Clear all Redis
    await redis.flushdb();

    console.log("✅ ALL CACHES CLEARED");
  } catch (error) {
    console.error("❌ Error clearing all caches:", error.message);
  }
};

/**
 * Smart cache clearing based on data relationships
 */
export const clearRelatedCaches = async (operation, data) => {
  try {
    console.log(`🧹 Smart cache clearing for operation: ${operation}`);

    switch (operation) {
      case "COLLEGE_UPDATED":
        await clearCollegeCaches(data.slug);
        await clearDashboardCaches(); // College count might change
        break;

      case "PLACEMENT_CREATED":
      case "PLACEMENT_UPDATED":
        await clearPlacementCaches(data.slug, data.year);
        await clearCollegeCaches(data.slug); // College placement years might change
        await clearDashboardCaches();
        break;

      case "NEWS_CREATED":
      case "NEWS_UPDATED":
        await clearNewsCaches(data.slug);
        await clearDashboardCaches(); // News count might change
        break;

      case "CUTOFF_UPDATED":
        await clearCutoffCaches(data.slug);
        break;

      default:
        console.warn(`⚠️ Unknown cache operation: ${operation}`);
    }
  } catch (error) {
    console.error(`❌ Error in smart cache clearing:`, error.message);
  }
};
