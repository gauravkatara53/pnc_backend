import { z } from "zod";

export const cutoffZodSchema = z.object({
  examType: z.enum(["JEE Main", "JEE Advanced", "NEET", "GATE"]),
  year: z.number().int().min(1900).max(new Date().getFullYear()),
  collegeId: z.string().length(24), // MongoDB ObjectId as hex string
  branch: z.string().min(1),
  category: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  seatType: z.enum(["Home State", "Other State"]),
  openingRank: z.number().int().positive().optional(),
  closingRank: z.number().int().positive().optional(),
  minimumPercentile: z.number().min(0).max(100).optional(),
  maximumPercentile: z.number().min(0).max(100).optional(),
  qualifyingMarks: z.number().positive().optional(),
  round: z.number().int().positive(),
  comment: z.string().optional(),
});
