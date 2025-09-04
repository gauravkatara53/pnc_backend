import NewsArticle from "../models/newsModel.js";

export const createNewsArticleService = async (data) => {
  const newsArticle = new NewsArticle(data);
  await newsArticle.save();
  return newsArticle;
};
