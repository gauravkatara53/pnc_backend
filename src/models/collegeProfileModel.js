import mongoose from "mongoose";
import { en } from "zod/locales";
const yearRankSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  rank: { type: String, required: true }, // e.g., "951-1000"
});

const rankingSchema = new mongoose.Schema({
  rankingBody: { type: String, required: true },
  category: { type: String, required: true },
  rankingType: {
    type: String,
    enum: ["national", "international"],
    required: true,
  },
  ranksByYear: { type: [yearRankSchema], default: [] },
});

const feeItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
});

const facilitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  available: { type: Boolean, default: false },
});

const connectivitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  distanceKm: { type: Number, min: 0 },
});

const addressConnectivitySchema = new mongoose.Schema({
  fullAddress: { type: String, required: true },
  connectivity: { type: [connectivitySchema], default: [] },
});

const admissionCriteriaSchema = new mongoose.Schema({
  criteriaList: [{ point: { type: String, required: true } }],
  forMoreDetails: String,
  detailsUrl: String,
});

const programSchema = new mongoose.Schema({
  programType: {
    type: String,
    enum: ["Undergraduate", "Postgraduate"],
    required: true,
  },
  courses: { type: [String], required: true },
});

const coursesOfferedSchema = new mongoose.Schema({
  programs: { type: [programSchema], default: [] },
});

const waiverSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
});

const collegeProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    bio: { type: String, required: true },
    image_url: { type: String },
    placementAnalytics_url: { type: [String] },
    fullNames: { type: String, required: true },
    fees: { type: Number, required: true, min: 0 },
    avgSalary: { type: Number, required: true, min: 0 },
    nirf: { type: String, required: true },
    stream: { enum: ["Engineering", "Medical", "Management"], type: String },
    highestPackage: { type: Number, required: true, min: 0 },
    placementRate: { type: Number, required: true, min: 0, max: 100 },
    instituteType: {
      enum: ["Private", "Govt", "Deemed"],
      default: "Public",
      type: String,
    },
    tag: {
      enum: [
        "IIT",
        "NIT",
        "IIIT",
        "GFTI",
        "Private",
        "State",
        "AIIMS",
        "Other",
      ],
      default: "Private",
      type: String,
    },
    establishedYear: Number,
    location: String,
    address: String,
    state: {
      enum: [
        "",
        "Andhra-Pradesh",
        "Arunachal-Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal-Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya-Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil-Nadu",
        "Telangana",
        "Tripura",
        "Uttar-Pradesh",
        "Uttarakhand",
        "West-Bengal",
        "Andaman-and-Nicobar-Islands",
        "Chandigarh",
        "Delhi",
        "Jammu-and-Kashmir",
        "Ladakh",
        "Lakshadweep",
        "Puducherry",
      ],
      type: String,
      default: "",
    },
    country: String,
    pincode: String,
    addressConnectivity: { type: [addressConnectivitySchema], default: [] },
    campusFacilities: { type: [facilitySchema], default: [] },
    rankings: { type: [rankingSchema], default: [] },
    admissionCriteria: admissionCriteriaSchema,
    coursesOffered: coursesOfferedSchema,
    seatsAvailable: Number,
    instituteFeeStructure: { type: [feeItemSchema], default: [] },
    hostelFeeStructure: { type: [feeItemSchema], default: [] },
    waiver: { type: [waiverSchema], default: [] },

    placementAnalytics: {
      totalOffers: Number,
      recruitersCount: Number,
      topRecruiters: [String],
      packageDistribution: [
        {
          range: String,
          percentage: Number,
          studentCount: Number,
        },
      ],
    },
    examType: {
      type: String,
      enum: ["JEE-Main", "JEE-Advanced", "NEET-UG", "GATE", "CAT"], // Add other exams as needed
      required: true,
    },
    isPlacementRateAvailable: { type: Boolean, default: true },
    isMedianPackageAvailable: { type: Boolean, default: true },
    isHighestPackageAvailable: { type: Boolean, default: true },
    isAveragePackageAvailable: { type: Boolean, default: true },
    contactEmail: String,
    contactPhone: String,
    website: String,
    AlsoKnownAs: { type: String },
  },
  { timestamps: true }
);

const CollegeProfile = mongoose.model("CollegeProfile", collegeProfileSchema);

export default CollegeProfile;
