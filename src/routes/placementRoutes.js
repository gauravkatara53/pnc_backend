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
} from "../controllers/placementController.js";

const router = Router();

// ✅ Create new placement
router.post("/:slug/create", createPlacementController);

router.post("/:slug/bulk-create", bulkCreatePlacementController);
// ✅ Get placements all
router.get("/list", getPlacementsController);
// ✅ Update placement by ID
router.put("/:slug/update", updatePlacementController);

// ✅ Delete placement by ID
router.delete("/:slug/delete", deletePlacementController);

// ✅ Get placements by slug
router.get("/:slug", getPlacementsByCollegeIdController);

// create placement stats
router.post("/create/:slug/stats", createPlacementStatsController);
router.get("/get/:slug/stats", getPlacementStatsByCollegeController);

//create top recruiters
router.post("/create/:slug/recruiters", createTopRecruiterController);
router.get("/get/:slug/recruiters", getTopRecruiterController);
export default router;
