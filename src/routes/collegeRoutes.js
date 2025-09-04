import { Router } from "express";
import {
  createCollegeController,
  getAllCollegesController,
  getCollegeBySlugController,
  uploadCollegeProfilePic,
  uploadPlacementAnalytics,
} from "../controllers/createCollegeController.js";
import { upload } from "../middlewares/multer.js";

const router = Router();
// routes/collegeRoutes.js
router.post("/create", createCollegeController);

// GET all with filters
router.get("/all", getAllCollegesController);

// GET by ID
router.get("/:slug", getCollegeBySlugController);

// Upload college profile picture by ID
router.post(
  "/:collegeId/upload-profile",
  upload.single("image"),
  uploadCollegeProfilePic
);
router.post(
  "/:collegeId/upload-placement-analytics",
  upload.single("image"),
  uploadPlacementAnalytics
);
export default router;
