import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : [];

      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, origin || true); // allow if in list, or no origin (like Postman)
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

import collegeRoutes from "./routes/collegeRoutes.js";
import placementRoutes from "./routes/placementRoutes.js";
import cutoffRoutes from "./routes/cutoffRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";

app.use("/api/v1/college", collegeRoutes);
app.use("/api/v1/placement", placementRoutes);
app.use("/api/v1/cutoff", cutoffRoutes);
app.use("/api/v1/news", newsRoutes);

export { app };
