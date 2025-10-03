import Redis from "ioredis";
import "dotenv/config"; // 👈 only needed if not in Next.js

const redisUrl = (process.env.REDIS_URL || "").trim();

console.log("Connected to Redis:---------------------");

const redis = new Redis(redisUrl, {
  tls: {}, // required for Upstash
});

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

export default redis;
