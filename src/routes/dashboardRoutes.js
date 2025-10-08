import { Router } from "express";
import {
  getDashboardStatsController,
  clearDashboardCacheController,
} from "../controllers/DashboardStats.js";

const router = Router();

// GET /api/dashboard/stats - Get simplified dashboard statistics
router.get("/stats", getDashboardStatsController);

// POST /api/dashboard/clear-cache - Clear dashboard caches (admin only)
router.post("/clear-cache", clearDashboardCacheController);

export default router;
