import { z } from "zod";

// yearRankSchema
export const yearRankSchema = z.object({
  year: z.number().int().min(1900),
  rank: z.string().min(1),
});

// rankingSchema
export const rankingSchema = z.object({
  rankingBody: z.string().min(1),
  category: z.string().min(1),
  rankingType: z.enum(["national", "international"]),
  ranksByYear: z.array(yearRankSchema).default([]),
});

// feeItemSchema
export const feeItemSchema = z.object({
  title: z.string().min(1),
  amount: z.number().nonnegative(),
});

// placementStatsSchema
export const placementStatsSchema = z.object({
  branch: z.string().min(1),
  placementRate: z.number().min(0).max(100).optional(),
  highestPackage: z.number().nonnegative().optional(),
  averagePackage: z.number().nonnegative().optional(),
});

// facilitySchema
export const facilitySchema = z.object({
  name: z.string().min(1),
  available: z.boolean().default(false),
});

// connectivitySchema
export const connectivitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  distanceKm: z.number().nonnegative().optional(),
});

// addressConnectivitySchema
export const addressConnectivitySchema = z.object({
  fullAddress: z.string().min(1),
  connectivity: z.array(connectivitySchema).default([]),
});

// admissionCriteriaSchema
export const admissionCriteriaSchema = z.object({
  criteriaList: z.array(z.object({ point: z.string().min(1) })),
  forMoreDetails: z.string().optional(),
  detailsUrl: z.string().url().optional(),
});

// programSchema
export const programSchema = z.object({
  programType: z.enum(["Undergraduate", "Postgraduate"]),
  courses: z.array(z.string().min(1)).nonempty(),
});

// coursesOfferedSchema
export const coursesOfferedSchema = z.object({
  programs: z.array(programSchema).default([]),
});

// waiverSchema
export const waiverSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

// main CollegeProfile schema
export const collegeProfileSchema = z.object({
  name: z.string().min(1),
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  bio: z.string().min(1),
  fullNames: z.string().min(1),
  fees: z.number().nonnegative(),
  avgSalary: z.number().nonnegative(),
  nirf: z.number().nonnegative(),
  highestPackage: z.number().nonnegative(),
  placementRate: z.number().min(0).max(100),
  instituteType: z.string().optional(),
  establishedYear: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  addressConnectivity: z.array(addressConnectivitySchema).default([]),
  campusFacilities: z.array(facilitySchema).default([]),
  rankings: z.array(rankingSchema).default([]),
  admissionCriteria: admissionCriteriaSchema.optional(),
  coursesOffered: coursesOfferedSchema.optional(),
  seatsAvailable: z.number().int().optional(),
  cutoffTrends: z.array(z.string()).default([]),
  feeStructure: z.array(feeItemSchema).default([]),
  waiver: z.array(waiverSchema).default([]),

  placementAnalytics: z
    .object({
      totalOffers: z.number().int().optional(),
      recruitersCount: z.number().int().optional(),
      topRecruiters: z.array(z.string()).optional(),
      packageDistribution: z
        .array(
          z.object({
            range: z.string(),
            percentage: z.number().min(0).max(100),
            studentCount: z.number().int().nonnegative(),
          })
        )
        .optional(),
    })
    .optional(),

  isPlacementRateAvailable: z.boolean().optional().default(true),
  isMedianPackageAvailable: z.boolean().optional().default(true),
  isHighestPackageAvailable: z.boolean().optional().default(true),
  isAveragePackageAvailable: z.boolean().optional().default(true),

  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional(),
});
