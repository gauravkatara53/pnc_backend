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
  // Destructure and keep raw values
  const {
    category,
    tags,
    authorName,
    dateFrom,
    dateTo,
    keyword,
    sortBy,
    page = "1",
    limit = "10",
  } = req.query;

  // Convert page/limit to numbers safely
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 10)); // cap at 100

  // Create deterministic cache key (sort query keys so same queries produce same key)
  const orderedQuery = {};
  Object.keys(req.query)
    .sort()
    .forEach((k) => {
      orderedQuery[k] = req.query[k];
    });
  const cacheKey = `news:list:${JSON.stringify(orderedQuery)}`;

  // Try cache first
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
    // allow tags as CSV string or array
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
        { "content.text": { $regex: kw, $options: "i" } }, // optional — if you store full content
      ];
    }
  }

  // Sort: allow custom sortBy but always ensure newest publishDate comes first as a tie-breaker.
  // If you want to completely ignore sortBy and use publishDate only, replace with { publishDate: -1 }
  const sortCondition = sortBy
    ? { [sortBy]: -1, publishDate: -1 }
    : { publishDate: -1 };

  const skip = (pageNum - 1) * limitNum;

  const newsArticles = await NewsArticle.find(filter)
    .sort(sortCondition)
    .skip(skip)
    .limit(limitNum)
    .select(
      "title slug summary category trending coverImage publishDate readTime"
    )
    .lean();

  // Cache results (store plain JS objects)
  setCache(cacheKey, newsArticles);

  return res
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
export const getAllNewsSlugsController = asyncHandler(async (req, res) => {
  const slugs = await NewsArticle.find({}, "slug").lean();
  const slugList = slugs.map((article) => article.slug);
  res
    .status(200)
    .json(
      new ApiResponse(200, slugList, "All news slugs fetched successfully")
    );
});
