// controllers/newsArticleController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createNewsArticleService } from "../services/newsArticleService.js";
import NewsArticle from "../models/newsModel.js";
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

  res
    .status(201)
    .json(
      new ApiResponse(201, newsArticle, "News article created successfully")
    );
});

import { setCache, getCache } from "../utils/nodeCache.js";

import redis from "../libs/redis.js";

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
