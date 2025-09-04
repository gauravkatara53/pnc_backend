import { Router } from "express";
import {
  createCutoffController,
  updateCutoffController,
  deleteCutoffController,
  getAllCutoffsController,
} from "../controllers/cutoffController.js";

const router = Router();

router.post("/create/:slug", createCutoffController);
router.put("/update/:slug", updateCutoffController);
router.delete("/delete/:slug", deleteCutoffController);
router.get("/all", getAllCutoffsController);

export default router;
