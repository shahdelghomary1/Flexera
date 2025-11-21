// /api/upload.js
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { upload } from "../middleware/multer.js";

// إعداد Cloudinary من Environment Variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  upload.single("image")(req, {}, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // رفع الصورة من الذاكرة لـ Cloudinary
    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "uploads" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    try {
      const result = await streamUpload();
      res.status(200).json({ url: result.secure_url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// منع body parsing التلقائي على Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};
