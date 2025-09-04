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
    publishDate,
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
    publishDate,
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
    sortBy,
    page = 1,
    limit = 10,
  } = req.query;

  // Dynamically generate a unique cache key from query params
  const cacheKey = `news:list:${JSON.stringify(req.query)}`;

  // Try cache first
  const cached = getCache(cacheKey);
  if (cached) {
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "News articles fetched (cached)"));
  }

  let filter = {};
  if (category) filter.category = category;
  if (tags) filter.tags = { $in: tags.split(",") };
  if (authorName) filter["author.name"] = authorName;
  if (dateFrom || dateTo) filter.publishDate = {};
  if (dateFrom) filter.publishDate.$gte = new Date(dateFrom);
  if (dateTo) filter.publishDate.$lte = new Date(dateTo);
  if (keyword)
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { summary: { $regex: keyword, $options: "i" } },
    ];

  const sortCondition = sortBy ? { [sortBy]: -1 } : { publishDate: -1 };
  const skip = (page - 1) * limit;

  const newsArticles = await NewsArticle.find(filter)
    .sort(sortCondition)
    .skip(skip)
    .limit(Number(limit))
    .select(
      "title slug summary category trending coverImage publishDate readTime"
    ) // Select only needed fields
    .lean();

  setCache(cacheKey, newsArticles); // Cache plain JS objects safely
  res
    .status(200)
    .json(
      new ApiResponse(200, newsArticles, "News articles fetched successfully")
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
