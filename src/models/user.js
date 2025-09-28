import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  mobileNumber: { type: String }, // phone number as string
  role: {
    type: String,
    enum: ["student", "admin", "moderator"], // allowed roles
    default: "student",
  },
  password: { type: String }, // hashed password
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

export default User;
