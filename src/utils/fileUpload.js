// utils/fileUpload.js
import { imagekit } from "./imageKitClient.js";
import fs from "fs";
import path from "path";
import mime from "mime-types";

export const uploadOnImageKit = async (localFilePath, subfolder = "") => {
  try {
    if (!localFilePath) return null;

    console.log("Uploading file to ImageKit:", localFilePath);

    const fileBuffer = fs.readFileSync(localFilePath);
    const fileName = `${Date.now()}-${path.basename(localFilePath)}`;
    const contentType =
      mime.lookup(localFilePath) || "application/octet-stream";

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: fileBuffer, // fileBuffer or base64 or file URL
      fileName,
      folder: subfolder ? `/${subfolder}` : "/", // ✅ organize inside folder
      useUniqueFileName: true,
      isPrivateFile: false, // change to true if you need signed URLs
      tags: ["topic_upload"],
      customMetadata: { contentType },
    });

    // Delete temp file after upload
    fs.unlinkSync(localFilePath);

    console.log("File uploaded to ImageKit:", uploadResponse.url);
    return uploadResponse.url;
  } catch (error) {
    console.error("Error uploading to ImageKit:", error.message);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};
