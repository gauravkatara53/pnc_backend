import { clerkMiddleware, requireAuth } from "@clerk/express";

// Use this if you want auth info on req.auth but allow unauthenticated access
export const clerkAuth = clerkMiddleware();

// Use this to strictly protect routes, rejecting unauthenticated requests
export const requireAuthMiddleware = requireAuth();

// You can export either or both, depending on your route needs
