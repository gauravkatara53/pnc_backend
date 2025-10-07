import NewsArticle from "../models/newsModel.js";
import { deleteCacheByPrefix } from "../utils/nodeCache.js";
import redis from "../libs/redis.js";

// Helper function to clear news-related caches
const clearNewsRelatedCaches = async (slug = null) => {
  try {
    console.log("🧹 Clearing news-related caches from service...");

    // Clear NodeCache patterns
    deleteCacheByPrefix("news:list:"); // Clear all news list caches
    deleteCacheByPrefix("news:trending:"); // Clear trending caches

    // Clear Redis patterns
    const redisKeys = await redis.keys("news:*");
    if (redisKeys.length > 0) {
      await redis.del(...redisKeys);
      console.log(
        `🧹 Cleared ${redisKeys.length} Redis keys with pattern news:*`
      );
    }

    console.log("✅ News-related caches cleared successfully from service");
  } catch (error) {
    console.error("❌ Error clearing news caches from service:", error);
  }
};

export const createNewsArticleService = async (data) => {
  const newsArticle = new NewsArticle(data);
  await newsArticle.save();

  // Clear news-related caches since new article affects lists and trending
  await clearNewsRelatedCaches(data.slug);

  return newsArticle;
};
