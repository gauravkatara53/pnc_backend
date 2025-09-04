import express from "express";
import { createOrGetUser } from "../controllers/userController.js";
import { clerkAuth } from "../middlewares/clerkAuth.js";

const router = express.Router();

router.get("/me", clerkAuth, createOrGetUser);

export default router;
