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
} from "../controllers/placementController.js";

const router = Router();

// ✅ Create new placement
router.post("/:slug/create", createPlacementController);
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

export default router;
