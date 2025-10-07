import { Router } from "express";
import {
  createNewsArticleController,
  deleteNewsArticleController,
  getAllNewsSlugsController,
  getNewsArticleBySlugController,
  getNewsArticlesController,
  getNewsArticlesTrendingController,
  updateNewsArticleController,
  uploadcoverImage,
} from "../controllers/newsController.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

router.post("/create", createNewsArticleController);

router.get("/all", getNewsArticlesController);

router.get("/:slug", getNewsArticleBySlugController);

router.get("/all/slugs", getAllNewsSlugsController);
router.get("/trending/1", getNewsArticlesTrendingController);

router.post(
  "/upload-cover-image/:slug",
  upload.single("image"),
  uploadcoverImage
);
router.put("/:slug/update", updateNewsArticleController);
router.delete("/:slug", deleteNewsArticleController);

export default router;
