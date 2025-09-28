import User from "../models/user.js";

export async function handleClerkWebhook(eventType, userData) {
  try {
    if (eventType === "user.created") {
      console.log("👤 New user created:", userData.id);

      await User.create({
        clerkUserId: userData.id,
        email: userData.email_addresses[0]?.email_address,
        firstName: userData.first_name || "",
        lastName: userData.last_name || "",
        profileImageUrl: userData.image_url || "",
        mobileNumber: userData.phone_numbers?.[0]?.phone_number || "",
        role: "student", // default
      });
    }

    if (eventType === "user.updated") {
      console.log("🔄 User updated:", userData.id);

      await User.findOneAndUpdate(
        { clerkUserId: userData.id },
        {
          email: userData.email_addresses[0]?.email_address,
          firstName: userData.first_name || "",
          lastName: userData.last_name || "",
          profileImageUrl: userData.image_url || "",
          mobileNumber: userData.phone_numbers?.[0]?.phone_number || "",
        },
        { new: true }
      );
    }

    if (eventType === "user.deleted") {
      console.log("🗑️ User deleted:", userData.id);

      await User.findOneAndDelete({ clerkUserId: userData.id });
    }
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    throw err;
  }
};
