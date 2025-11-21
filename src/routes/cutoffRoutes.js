import { Router } from "express";
import {
  createCutoffController,
  updateCutoffController,
  deleteCutoffController,
  getAllCutoffsController,
  deleteAllIIITCutoffsController,
  bulkCreateCutoffController,
} from "../controllers/cutoffController.js";

const router = Router();

router.post("/create/:slug", createCutoffController);
router.post("/bulk-create/:slug", bulkCreateCutoffController);
router.put("/update/:slug", updateCutoffController);
router.delete("/delete/:slug", deleteCutoffController);
router.get("/all", getAllCutoffsController);

router.delete("/iiit", deleteAllIIITCutoffsController);

export default router;
