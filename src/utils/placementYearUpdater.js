import CollegeProfile from "../models/collegeProfileModel.js";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPrefix,
} from "./nodeCache.js";
import redis from "../libs/redis.js";

/**
 * 📅 Auto-update placement years when placement data is uploaded
 * Automatically adds years to availablePlacementReports array and clears caches
 */

// 📅 Auto-update availablePlacementReports when placement data is added
export const addPlacementYearToCollege = async (collegeSlug, year) => {
  try {
    console.log(`📅 Adding year ${year} to college: ${collegeSlug}`);

    const college = await CollegeProfile.findOne({ slug: collegeSlug });
    if (!college) {
      throw new Error(`College not found with slug: ${collegeSlug}`);
    }

    // Validate year
    if (!year || isNaN(year) || year < 2000 || year > 2050) {
      throw new Error(
        `Invalid year provided: ${year}. Year must be between 2000 and 2050`
      );
    }

    // Check if year already exists
    if (
      college.availablePlacementReports &&
      college.availablePlacementReports.includes(year)
    ) {
      console.log(`✅ Year ${year} already exists for ${collegeSlug}`);
      return true;
    }

    // Initialize array if it doesn't exist
    if (!college.availablePlacementReports) {
      college.availablePlacementReports = [];
    }

    // Add year and sort in descending order (newest first)
    college.availablePlacementReports.push(year);
    college.availablePlacementReports.sort((a, b) => b - a);

    const savedCollege = await college.save();
    if (!savedCollege) {
      throw new Error(
        `Failed to save placement year ${year} to college ${collegeSlug}`
      );
    }

    console.log(
      `✅ Added year ${year} to ${collegeSlug}. Available years: ${college.availablePlacementReports}`
    );

    // 🧹 Clear related caches for this college and placement data
    await clearPlacementRelatedCaches(collegeSlug, year);

    return true;
  } catch (error) {
    console.error(
      `❌ Error adding year to college ${collegeSlug}:`,
      error.message
    );
    throw error; // Re-throw the error instead of returning false
  }
};

// 🧹 Clear placement-related caches
const clearPlacementRelatedCaches = async (collegeSlug, year) => {
  try {
    console.log(
      `🧹 Clearing caches for college: ${collegeSlug}, year: ${year}`
    );

    // NodeCache patterns to clear
    const nodeCachePatterns = [
      `colleges:*`, // All college lists
      `college:*`, // All college-related caches
      `placement:*`, // All placement data
      `placements:*`, // All placement lists
      `dashboard:*`, // Dashboard stats
      `stats:*`, // Statistics
    ];

    // Clear NodeCache
    console.log(`🧹 Clearing NodeCache patterns:`, nodeCachePatterns);
    nodeCachePatterns.forEach((pattern) => {
      const deleted = deleteCacheByPrefix(pattern);
      console.log(`🧹 NodeCache pattern ${pattern}: ${deleted} keys cleared`);
    });

    // Clear specific cache keys
    const specificCacheKeys = [
      `college:slug:${collegeSlug}`,
      `placement:college:${collegeSlug}`,
      `placementStats:college:${collegeSlug}`,
    ];

    specificCacheKeys.forEach((key) => {
      const deleted = deleteCache(key);
      console.log(
        `🗑️ NodeCache specific key ${key}: ${deleted ? "cleared" : "not found"}`
      );
    });

    // Redis patterns to clear
    const redisPatterns = [
      `colleges:*`,
      `college:*`,
      `placement:*`,
      `placements:*`,
      `dashboard:*`,
      `stats:*`,
      `*${collegeSlug}*`, // Any cache containing college slug
      `*${year}*`, // Any cache containing the year
    ];

    // Clear specific Redis keys first
    const specificRedisKeys = [
      `college:slug:${collegeSlug}`,
      `placement:college:${collegeSlug}`,
      `placementStats:college:${collegeSlug}`,
    ];

    for (const key of specificRedisKeys) {
      const deleted = await redis.del(key);
      if (deleted > 0) {
        console.log(`🗑️ Cleared specific Redis key: ${key}`);
      }
    }

    // Clear Redis caches with patterns
    for (const pattern of redisPatterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(
          `🗑️ Cleared ${keys.length} Redis keys for pattern: ${pattern}`
        );
      }
    }

    console.log(`✅ Cache clearing completed for ${collegeSlug} - ${year}`);
  } catch (error) {
    console.error(`❌ Error clearing caches:`, error.message);
  }
};

/**
 * 📅 Remove year from availablePlacementReports
 * @param {string} collegeSlug - The college slug
 * @param {number} year - The placement year to remove
 * @returns {Promise<boolean>} - Returns true if year was removed, false if not found
 */
export const removePlacementYear = async (collegeSlug, year) => {
  try {
    console.log(
      `🔄 Removing placement year ${year} for college: ${collegeSlug}`
    );

    // Find the college
    const college = await CollegeProfile.findOne({ slug: collegeSlug });

    if (!college) {
      console.error(`❌ College not found with slug: ${collegeSlug}`);
      return false;
    }

    // Check if year exists
    if (
      !college.availablePlacementReports ||
      !college.availablePlacementReports.includes(year)
    ) {
      console.log(`ℹ️ Year ${year} not found for ${college.name}`);
      return false;
    }

    // Remove the year
    const updatedYears = college.availablePlacementReports.filter(
      (y) => y !== year
    );

    // Update the college
    await CollegeProfile.findByIdAndUpdate(
      college._id,
      { availablePlacementReports: updatedYears },
      { new: true }
    );

    console.log(
      `✅ Removed year ${year} from ${
        college.name
      }. Available years: [${updatedYears.join(", ")}]`
    );
    return true;
  } catch (error) {
    console.error(`❌ Error removing placement year:`, error);
    return false;
  }
};

/**
 * 📊 Get available placement years for a college
 * @param {string} collegeSlug - The college slug
 * @returns {Promise<number[]>} - Array of available years
 */
export const getAvailablePlacementYears = async (collegeSlug) => {
  try {
    const college = await CollegeProfile.findOne(
      { slug: collegeSlug },
      { availablePlacementReports: 1, name: 1 }
    );

    if (!college) {
      console.error(`❌ College not found with slug: ${collegeSlug}`);
      return [];
    }

    return college.availablePlacementReports || [];
  } catch (error) {
    console.error(`❌ Error getting placement years:`, error);
    return [];
  }
};

/**
 * 🔄 Auto-update placement year when placement data is uploaded
 * Call this function whenever placement stats/data is uploaded
 * @param {string} collegeSlug - The college slug
 * @param {Object} placementData - The placement data object
 * @returns {Promise<boolean>} - Success status
 */
export const autoUpdatePlacementYear = async (collegeSlug, placementData) => {
  try {
    // Validate inputs
    if (!collegeSlug || typeof collegeSlug !== "string") {
      throw new Error("College slug is required and must be a string");
    }

    if (!placementData || typeof placementData !== "object") {
      throw new Error("Placement data is required and must be an object");
    }

    // Extract year from placement data
    let year = null;

    if (placementData.year) {
      year = parseInt(placementData.year);
    } else if (placementData.academicYear) {
      // Handle formats like "2024-25" -> 2025 or "2024" -> 2024
      const yearMatch = placementData.academicYear.toString().match(/(\d{4})/g);
      if (yearMatch) {
        year = parseInt(yearMatch[yearMatch.length - 1]); // Take the last year
      }
    } else {
      throw new Error(
        'Year is required in placement data. Provide either "year" or "academicYear" field'
      );
    }

    if (!year || isNaN(year) || year < 2000 || year > 2050) {
      throw new Error(
        `Invalid year extracted: ${year}. Year must be between 2000 and 2050`
      );
    }

    console.log(
      `🎯 Auto-updating placement year ${year} for college: ${collegeSlug}`
    );

    const success = await addPlacementYearToCollege(collegeSlug, year);
    if (!success) {
      throw new Error(
        `Failed to add placement year ${year} to college ${collegeSlug}`
      );
    }

    return success;
  } catch (error) {
    console.error(`❌ Error in auto-update placement year:`, error.message);
    throw error; // Re-throw the error instead of returning false
  }
};

// Export aliases for backward compatibility
export const addPlacementYear = addPlacementYearToCollege;
