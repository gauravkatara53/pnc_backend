// auth.middleware.js
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js"; // No need for destructuring

import { getCache, setCache } from "../utils/nodeCache.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  // Extract token from either cookies or Authorization header
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request. Token missing.");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const cacheKey = `user:${decodedToken._id}`;
  let user = getCache(cacheKey);

  if (user) {
    console.log("User fetched from cache");
    req.user = user;
    return next();
  }

  console.log("User fetched from DB");
  user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "User not found or token no longer valid");
  }

  // Cache the user data
  setCache(cacheKey, user);

  req.user = user;
  next();
});
