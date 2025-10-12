import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    // Activity details
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE"],
      required: true,
    },

    // Entity information
    entityType: {
      type: String,
      enum: [
        "COLLEGE_PROFILE",
        "PLACEMENT",
        "PLACEMENT_STATS",
        "TOP_RECRUITER",
        "NEWS",
        "CUTOFF",
        "USER",
        "COURSE",
        "EXAM",
      ],
      required: true,
    },

    entityId: {
      type: String,
      required: true,
    },

    entityName: {
      type: String, // Human readable name (e.g., college name, news title)
      required: true,
    },

    // Activity details
    description: {
      type: String,
      required: true,
    },

    // Changed data (for updates)
    changes: {
      type: mongoose.Schema.Types.Mixed, // Store what fields were changed
      default: null,
    },

    // User information (if available)
    userId: {
      type: String,
      default: null,
    },

    userEmail: {
      type: String,
      default: null,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // IP address and user agent for audit
    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt
    collection: "activity_logs",
  }
);

// Index for efficient querying by date (recent activities)
activityLogSchema.index({ createdAt: -1 });

// Index for querying by entity
activityLogSchema.index({ entityType: 1, entityId: 1 });

// Index for user activities
activityLogSchema.index({ userId: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
