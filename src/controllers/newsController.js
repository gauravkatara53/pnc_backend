// controllers/newsArticleController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createNewsArticleService } from "../services/newsArticleService.js";
import NewsArticle from "../models/newsModel.js";
import {
  setCache,
  getCache,
  deleteCacheByPrefix,
  deleteCache,
} from "../utils/nodeCache.js";
import redis from "../libs/redis.js";
import { imagekit } from "../utils/imageKitClient.js";
import { clearDashboardStatsCaches } from "./DashboardStats.js";

// Helper function to clear news-related caches
const clearNewsRelatedCaches = async (slug = null) => {
  try {
    console.log("🧹 Clearing news-related caches...");

    // Clear NodeCache patterns
    deleteCacheByPrefix("news:list:"); // Clear all news list caches
    deleteCacheByPrefix("news:trending:"); // Clear trending caches
    deleteCacheByPrefix("news:related:"); // Clear related news caches

    if (slug) {
      deleteCache(`news:slug:${slug}`); // Clear specific article cache
      console.log(`🧹 Cleared specific article cache: news:slug:${slug}`);
    }

    // Clear Redis patterns
    const redisKeys = await redis.keys("news:*");
    if (redisKeys.length > 0) {
      await redis.del(...redisKeys);
      console.log(
        `🧹 Cleared ${redisKeys.length} Redis keys with pattern news:*`
      );
    }

    // Also clear dashboard caches since news count affects dashboard stats
    await clearDashboardStatsCaches();

    console.log("✅ News-related caches cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing news caches:", error);
  }
};
export const createNewsArticleController = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    summary,
    trending,
    coverImage,
    tags,
    category,
    author,
    readTime,
    sections,
  } = req.body;

  const newsArticle = await createNewsArticleService({
    title,
    slug,
    summary,
    trending,
    coverImage,
    tags,
    category,
    author,
    readTime,
    sections,
  });

  // Clear all news-related caches since new article affects lists and trending
  await clearNewsRelatedCaches(slug);

  res
    .status(201)
    .json(
      new ApiResponse(201, newsArticle, "News article created successfully")
    );
});

export const getNewsArticlesController = asyncHandler(async (req, res) => {
  const {
    category,
    tags,
    authorName,
    dateFrom,
    dateTo,
    keyword,
    page = "1",
    limit = "10",
  } = req.query;

  // Convert page/limit safely
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));

  // Create deterministic cache key (sorted query)
  const orderedQuery = {};
  Object.keys(req.query)
    .sort()
    .forEach((k) => {
      orderedQuery[k] = req.query[k];
    });
  const cacheKey = `news:list:${JSON.stringify(orderedQuery)}`;

  // 1. Try Node-cache (L1, fast)
  let cached = getCache(cacheKey);
  if (cached) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "News articles fetched (L1 cache)"));
  }

  // 2. Try Redis (L2, shared)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    const parsed = JSON.parse(cachedRedis);
    // Re-fill Node-cache for super fast next request
    setCache(cacheKey, parsed, 60); // 1 min local cache

    return res
      .status(200)
      .json(new ApiResponse(200, parsed, "News articles fetched (L2 cache)"));
  }

  // 3. Cache miss → build filter and query DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  const filter = {};
  if (category) filter.category = category;

  if (tags) {
    const tagsArray = Array.isArray(tags)
      ? tags
      : String(tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
    if (tagsArray.length) filter.tags = { $in: tagsArray };
  }

  if (authorName) filter["author.name"] = authorName;

  if (dateFrom || dateTo) filter.publishDate = {};
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (!isNaN(fromDate)) filter.publishDate.$gte = fromDate;
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    if (!isNaN(toDate)) filter.publishDate.$lte = toDate;
  }

  if (keyword) {
    const kw = String(keyword).trim();
    if (kw) {
      filter.$or = [
        { title: { $regex: kw, $options: "i" } },
        { summary: { $regex: kw, $options: "i" } },
        { "content.text": { $regex: kw, $options: "i" } },
      ];
    }
  }

  const sortCondition = { publishDate: -1 };
  const skip = (pageNum - 1) * limitNum;

  // Query DB in parallel
  const [newsArticles, totalCount] = await Promise.all([
    NewsArticle.find(filter)
      .sort(sortCondition)
      .skip(skip)
      .limit(limitNum)
      .select(
        "title slug summary category trending coverImage publishDate readTime"
      )
      .lean(),
    NewsArticle.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  const responsePayload = {
    articles: newsArticles,
    pagination: {
      totalCount,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };

  // Save to both caches
  setCache(cacheKey, responsePayload, 60); // Node-cache → 1 min
  await redis.set(cacheKey, JSON.stringify(responsePayload), "EX", 300); // Redis → 5 min

  console.log("✅ Cached in Node-cache + Redis:", cacheKey);

  return res
    .status(200)
    .json(new ApiResponse(200, responsePayload, "News articles fetched (DB)"));
});

export const getNewsArticleBySlugController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `news:slug:${slug}`;

  // 1. Try Node-cache (L1)
  let cached = getCache(cacheKey);
  if (cached) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return res.status(200).json(cached);
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    const parsed = JSON.parse(cachedRedis);
    setCache(cacheKey, parsed, 300); // re-fill Node-cache (5 min)

    return res.status(200).json(parsed);
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  const newsArticle = await NewsArticle.findOne({ slug }).lean();
  if (!newsArticle) {
    return res.status(404).json({ message: "Article not found." });
  }

  // Save into both caches
  setCache(cacheKey, newsArticle, 300); // Node-cache (5 min)
  await redis.set(cacheKey, JSON.stringify(newsArticle), "EX", 300); // Redis (5 min)

  console.log("✅ Cached in Node-cache + Redis:", cacheKey);

  return res.status(200).json(newsArticle);
});
export const getAllNewsSlugsController = asyncHandler(async (req, res) => {
  const slugs = await NewsArticle.find({}, "slug").lean();
  const slugList = slugs.map((article) => article.slug);
  res
    .status(200)
    .json(
      new ApiResponse(200, slugList, "All news slugs fetched successfully")
    );
});

export const getNewsArticlesTrendingController = asyncHandler(
  async (req, res) => {
    try {
      const cacheKey = "news:trending:latest:2";
      const bypass = String(req.query.bypassCache || "") === "true";
      const invalidate = String(req.query.invalidateCache || "") === "true";

      console.log(
        "[trending] request received, bypassCache=",
        bypass,
        "invalidateCache=",
        invalidate
      );

      // 🔹 1. Invalidate cache if requested
      if (invalidate) {
        try {
          // Clear from NodeCache
          const { delCache } = await import("../utils/nodeCache.js");
          if (delCache) {
            delCache(cacheKey);
            console.log("[trending] L1 cache invalidated:", cacheKey);
          }
          // Clear from Redis
          await redis.del(cacheKey);
          console.log("[trending] L2 Redis cache invalidated:", cacheKey);
        } catch (e) {
          console.warn("[trending] error invalidating cache:", e);
        }
      }

      // 🔹 2. Try cache unless bypass=true
      if (!bypass) {
        // Check NodeCache (L1)
        let cached = getCache(cacheKey);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          console.log("[trending] ⚡ L1 NodeCache hit");
          return res
            .status(200)
            .json(
              new ApiResponse(
                200,
                { articles: cached },
                "Trending news fetched (L1 cache)"
              )
            );
        }

        // Check Redis (L2)
        const cachedRedis = await redis.get(cacheKey);
        if (cachedRedis) {
          console.log("[trending] ⚡ L2 Redis hit");
          const parsed = JSON.parse(cachedRedis);

          // Refill NodeCache
          setCache(cacheKey, parsed, 60); // 1 min local cache

          return res
            .status(200)
            .json(
              new ApiResponse(
                200,
                { articles: parsed },
                "Trending news fetched (L2 cache)"
              )
            );
        }
      }

      // 🔹 3. If cache miss → DB query
      const trendingCount = await NewsArticle.countDocuments({
        trending: true,
      });
      console.log(`[trending] countDocuments => ${trendingCount}`);

      const newsArticles = await NewsArticle.find({ trending: true })
        .sort({ publishDate: -1 })
        .limit(2)
        .select(
          "title slug summary category trending coverImage publishDate readTime"
        )
        .lean();

      console.log("[trending] fetched from DB:", newsArticles.length);

      // 🔹 4. Save into both caches
      setCache(cacheKey, newsArticles, 60); // NodeCache → 1 min
      await redis.set(cacheKey, JSON.stringify(newsArticles), "EX", 300); // Redis → 5 min

      console.log("[trending] ✅ Cached in L1 + L2");

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { articles: newsArticles },
            "Latest 2 trending news fetched (DB)"
          )
        );
    } catch (error) {
      console.error("Error fetching trending news:", error);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Error fetching trending news"));
    }
  }
);

export const updateNewsArticleController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const updateData = req.body;

  // Find the article by slug
  const newsArticle = await NewsArticle.findOne({ slug });
  if (!newsArticle) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Article not found."));
  }

  // Update fields
  Object.keys(updateData).forEach((key) => {
    newsArticle[key] = updateData[key];
  });

  await newsArticle.save();

  // Clear all news-related caches since update may affect lists, trending, and specific article
  await clearNewsRelatedCaches(slug);

  res
    .status(200)
    .json(
      new ApiResponse(200, newsArticle, "News article updated successfully")
    );
});

export const deleteNewsArticleController = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  // Find and delete the article by slug
  const newsArticle = await NewsArticle.findOneAndDelete({ slug });
  if (!newsArticle) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Article not found."));
  }

  // Clear all news-related caches since deletion affects lists and trending
  await clearNewsRelatedCaches(slug);

  res
    .status(200)
    .json(new ApiResponse(200, null, "News article deleted successfully"));
});

export const uploadcoverImage = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    // Generate a unique filename
    const fileName = `${Date.now()}-${req.file.originalname}`;

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: req.file.buffer, // Multer memory buffer
      fileName,
      folder: "/coverImage", // 👈 organized folder
      useUniqueFileName: true,
    });

    // Update news article with new image URL using slug
    const newsArticle = await NewsArticle.findOneAndUpdate(
      { slug },
      { coverImage: uploadResponse.url },
      { new: true } // return updated document
    );

    if (!newsArticle) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Clear news-related caches since cover image update affects article display
    await clearNewsRelatedCaches(slug);

    res.status(200).json({
      success: true,
      message: "cover image  uploaded successfully",
      imageUrl: uploadResponse.url,
      newsArticle,
    });
  } catch (err) {
    console.error("Error uploading cover image:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getRelatedNewsController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `news:related:${slug}`;

  // 1. Try Node-cache (L1)
  let cachedRelated = getCache(cacheKey);
  if (cachedRelated) {
    console.log("⚡ L1 Node-cache hit:", cacheKey);
    return res
      .status(200)
      .json(
        new ApiResponse(200, cachedRelated, "Related news fetched (cached)")
      );
  }

  // 2. Try Redis (L2)
  const cachedRedis = await redis.get(cacheKey);
  if (cachedRedis) {
    console.log("⚡ L2 Redis hit:", cacheKey);

    const parsed = JSON.parse(cachedRedis);
    // Save into Node-cache for next time
    setCache(cacheKey, parsed, 300); // 5 minutes TTL

    return res
      .status(200)
      .json(new ApiResponse(200, parsed, "Related news fetched (cached)"));
  }

  // 3. Cache miss → fetch from DB
  console.log("❌ Cache miss (DB fetch):", cacheKey);

  // First, find the original article to get its tags and category
  const originalArticle = await NewsArticle.findOne({ slug })
    .select("tags category title")
    .lean();

  if (!originalArticle) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Original article not found"));
  }

  // Build query for related articles
  const relatedQuery = {
    slug: { $ne: slug }, // Exclude the original article
    $or: [],
  };

  // Add category match if available
  if (originalArticle.category) {
    relatedQuery.$or.push({ category: originalArticle.category });
  }

  // Add tag matches if available
  if (originalArticle.tags && originalArticle.tags.length > 0) {
    relatedQuery.$or.push({
      tags: { $in: originalArticle.tags },
    });
  }

  // If no category or tags, find other articles (fallback)
  if (relatedQuery.$or.length === 0) {
    delete relatedQuery.$or;
  }

  // Find related articles with priority scoring
  const relatedArticles = await NewsArticle.aggregate([
    { $match: relatedQuery },
    {
      $addFields: {
        // Calculate relevance score
        categoryMatch: {
          $cond: [
            { $eq: ["$category", originalArticle.category] },
            10, // Higher score for category match
            0,
          ],
        },
        tagMatches: {
          $size: {
            $ifNull: [
              {
                $setIntersection: [
                  { $ifNull: ["$tags", []] },
                  originalArticle.tags || [],
                ],
              },
              [],
            ],
          },
        },
        relevanceScore: {
          $add: [
            {
              $cond: [{ $eq: ["$category", originalArticle.category] }, 10, 0],
            },
            {
              $multiply: [
                {
                  $size: {
                    $ifNull: [
                      {
                        $setIntersection: [
                          { $ifNull: ["$tags", []] },
                          originalArticle.tags || [],
                        ],
                      },
                      [],
                    ],
                  },
                },
                2, // Each tag match gives 2 points
              ],
            },
          ],
        },
      },
    },
    {
      $sort: {
        relevanceScore: -1,
        publishDate: -1, // Recent articles as secondary sort
      },
    },
    {
      $limit: 4,
    },
    {
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        coverImage: 1,
        publishDate: 1,
        relevanceScore: 1,
      },
    },
  ]);

  // If we don't have enough related articles, fill with recent articles
  if (relatedArticles.length < 4) {
    const additionalCount = 4 - relatedArticles.length;
    const excludeSlugs = [
      slug,
      ...relatedArticles.map((article) => article.slug),
    ];

    const additionalArticles = await NewsArticle.find({
      slug: { $nin: excludeSlugs },
    })
      .select("_id title slug coverImage publishDate")
      .sort({ publishDate: -1 })
      .limit(additionalCount)
      .lean();

    // Add additional articles with score 0
    additionalArticles.forEach((article) => {
      relatedArticles.push({
        ...article,
        relevanceScore: 0,
      });
    });
  }

  // Format the response - only essential data (no tags)
  const formattedRelated = relatedArticles.map((article) => ({
    id: article._id,
    title: article.title,
    slug: article.slug,
    coverImage: article.coverImage || null,
  }));

  const responseData = {
    relatedArticles: formattedRelated,
    totalFound: formattedRelated.length,
  };

  // Save to both caches
  setCache(cacheKey, responseData, 300); // Node-cache (5 min TTL)
  await redis.set(cacheKey, JSON.stringify(responseData), "EX", 600); // Redis (10 min TTL)

  console.log("✅ Related news cached in Node-cache + Redis:", cacheKey);

  res
    .status(200)
    .json(
      new ApiResponse(200, responseData, "Related news fetched successfully")
    );
});
