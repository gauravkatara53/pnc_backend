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

  // Create deterministic cache key
  const orderedQuery = {};
  Object.keys(req.query)
    .sort()
    .forEach((k) => {
      orderedQuery[k] = req.query[k];
    });
  const cacheKey = `news:list:${JSON.stringify(orderedQuery)}`;

  // Check cache
  const cached = getCache(cacheKey);
  if (cached) {
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "News articles fetched (cached)"));
  }

  // Build filter
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
        { "content.text": { $regex: kw, $options: "i" } }, // optional if you store full content
      ];
    }
  }

  // 🔥 Always latest → oldest
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

  // Cache response
  setCache(cacheKey, responsePayload);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responsePayload,
        "News articles fetched successfully"
      )
    );
});

export const getNewsArticleBySlugController = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `news:slug:${slug}`;

  const cached = getCache(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const newsArticle = await NewsArticle.findOne({ slug }).lean(); // <--- use lean here
  if (!newsArticle) {
    return res.status(404).json({ message: "Article not found." });
  }

  setCache(cacheKey, newsArticle); // Cache plain object
  res.status(200).json(newsArticle);
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
