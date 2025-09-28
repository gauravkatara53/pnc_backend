const { verifyToken } = require("@clerk/clerk-sdk-node");

/**
 * Protects a route by requiring a valid Clerk JWT token.
 * Usage: router.post("/create", protected, createController)
 */
async function protected(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verify Clerk JWT
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Attach Clerk user session to request
    req.auth = session;

    next();
  } catch (err) {
    console.error("❌ Clerk auth failed:", err.message);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

module.exports = protected;
