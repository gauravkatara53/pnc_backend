import { z } from "zod";

export const placementZodSchema = z.object({
  collegeId: z.string().length(24), // MongoDB ObjectId as 24-char hex string

  branch: z.string().min(1), // e.g., "Bio Technology"

  placementPercentage: z.number().min(0).max(100).optional(),

  medianPackageLPA: z.number().min(0).optional(),

  highestPackageLPA: z.number().min(0).optional(),

  averagePackageLPA: z.number().min(0).optional(),
});
