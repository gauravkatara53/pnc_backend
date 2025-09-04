import User from "../models/user.js";

export const createOrGetUser = async (req, res) => {
  try {
    const { userId, sessionClaims } = req.auth;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const email = sessionClaims?.email || "no-email@clerk.com";

    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      user = new User({ clerkId: userId, email });
      await user.save();
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
