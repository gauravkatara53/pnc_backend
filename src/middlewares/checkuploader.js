// middlewares/checkRoleAndVerification.js

import ApiError from "../utils/ApiError.js";

// Factory middleware to check role and verification status
export const checkRoleAndVerification = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }

    if (!user.isUploaderVerified) {
      throw new ApiError(403, "Not: Email not verified");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ApiError(
        403,
        `Forbidden: Access restricted to [${allowedRoles.join(", ")}]`
      );
    }

    next();
  };
};
