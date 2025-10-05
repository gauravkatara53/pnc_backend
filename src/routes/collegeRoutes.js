import { Router } from "express";
import {
  createCollegeController,
  getAllCollegesController,
  getAllCollegeSlugsController,
  getCollegeBySlugController,
  updateCollegeProfileController,
  uploadCollegeProfilePic,
  uploadPlacementAnalytics,
} from "../controllers/createCollegeController.js";
import { upload } from "../middlewares/multer.js";

const router = Router();
// routes/collegeRoutes.js
router.post("/create", createCollegeController);

// route to update the college profile data 
router.put("/:slug/update", updateCollegeProfileController)

// GET all with filters
router.get("/all", getAllCollegesController);

// GET by ID
router.get("/:slug", getCollegeBySlugController);

// Upload college profile picture by ID
router.post(
  "/:slug/upload-profile",
  upload.single("image"),
  uploadCollegeProfilePic
);
router.post(
  "/:slug/upload-placement-analytics",
  upload.single("image"),
  uploadPlacementAnalytics
);

router.get("/all/slugs", getAllCollegeSlugsController);
export default router;
