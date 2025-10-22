// routes/predictorRoutes.js
import express from "express";
import { predictColleges } from "../controllers/predictorController.js";

const router = express.Router();

router.get("/predict", predictColleges);

export default router;
