import { imagekit } from "../utils/imageKitClient.js";

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;

    const uploadResponse = await imagekit.upload({
      file: req.file.buffer, // 👈 buffer directly from Multer
      fileName,
      folder: "/topic", // 👈 folder inside ImageKit
      useUniqueFileName: true,
    });

    res.status(200).json({
      message: "File uploaded successfully",
      url: uploadResponse.url,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
