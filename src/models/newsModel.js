import mongoose from "mongoose";

const newsArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    trending: { type: Boolean, required: true },
    coverImage: { type: String },
    tags: [{ type: String }],
    category: { type: String, required: true },
    author: {
      name: { type: String, required: true },
      avatar: { type: String },
      role: { type: String },
    },
    publishDate: { type: Date, default: Date.now },
    readTime: { type: Number, default: 5 },
    views: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    helpfulVotes: { type: Number, default: 0 },
    sections: [
      {
        heading: { type: String },
        paragraphs: [{ type: String }],
        image: { type: String },
        table: {
          headers: [{ type: String }],
          rows: [[{ type: String }]], // 2D array for table rows
        },
      },
    ],
  },
  { timestamps: true }
);

const NewsArticle = mongoose.model("NewsArticle", newsArticleSchema);

export default NewsArticle;
