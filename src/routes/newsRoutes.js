import { Router } from "express";
import {
  createNewsArticleController,
  getNewsArticleBySlugController,
  getNewsArticlesController,
} from "../controllers/newsController.js";

const router = Router();

router.post("/create", createNewsArticleController);

router.get("/all", getNewsArticlesController);

router.get("/:slug", getNewsArticleBySlugController);

export default router;
