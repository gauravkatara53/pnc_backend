import Router from "express";
import {
  createPlacementController,
  updatePlacementController,
  deletePlacementController,
  // getPlacementsByCollegeController,
  getPlacementsController,
  getPlacementsByCollegeIdController,
  getPlacementStatsByCollegeController,
  createPlacementStatsController,
  createTopRecruiterController,
  getTopRecruiterController,
  bulkCreatePlacementController,
  getAllPlacementStatsController,
  deletePlacementStatsController,
  updatePlacementStatsController,
  getAllTopRecruitersController,
  updateTopRecruiterController,
  deleteTopRecruiterController,
  uploadPlacementStatsGraphController,
} from "../controllers/placementController.js";
import { de } from "zod/locales";
import { upload } from "../middlewares/multer.js";

const router = Router();

// ✅ Create new placement
router.post("/:slug/create", createPlacementController);

router.post("/:slug/bulk-create", bulkCreatePlacementController);
// ✅ Get placements all
router.get("/list", getPlacementsController);
// ✅ Update placement by ID
router.put("/:id/update", updatePlacementController);

// ✅ Delete placement by ID
router.delete("/:id/delete", deletePlacementController);

// ✅ Get placements by slug
router.get("/:slug", getPlacementsByCollegeIdController);

// create placement stats
router.post("/create/:slug/stats", createPlacementStatsController);
router.get("/get/:slug/stats", getPlacementStatsByCollegeController);
router.get("/get/all/placement-stats", getAllPlacementStatsController);

router.delete("/delete/:id/stats", deletePlacementStatsController);
router.put("/update/:id/stats", updatePlacementStatsController);

//create top recruiters
router.post("/create/:slug/recruiters", createTopRecruiterController);
router.get("/get/:slug/recruiters", getTopRecruiterController);

router.delete("/delete/:id/recruiters", deleteTopRecruiterController);
router.put("/update/:id/recruiters", updateTopRecruiterController);
router.get("/all/recruiters", getAllTopRecruitersController);

// Upload college placement picture by _id
router.post(
  "/:_id/upload-graph",
  upload.single("image"),
  uploadPlacementStatsGraphController
);
export default router;
