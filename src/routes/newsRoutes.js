import { Router } from "express";
import {
  createNewsArticleController,
  getAllNewsSlugsController,
  getNewsArticleBySlugController,
  getNewsArticlesController,
} from "../controllers/newsController.js";

const router = Router();

router.post("/create", createNewsArticleController);

router.get("/all", getNewsArticlesController);

router.get("/:slug", getNewsArticleBySlugController);

router.get("/all/slugs", getAllNewsSlugsController);

export default router;
