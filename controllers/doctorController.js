import Doctor from "../models/doctorModel.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// إعداد Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// جلب كل الدكاترة
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json({ doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// إضافة دكتور مع صورة
export const addDoctor = async (req, res) => {
  try {
    const { _id, name, email, phone } = req.body;

    if (!_id || !name || !email || !phone)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await Doctor.findOne({ email });
    if (exists) return res.status(400).json({ message: "Doctor email already exists" });

    let imageUrl = null;
    if (req.file) {
      const streamUpload = () => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "uploads" },
          (error, result) => (result ? resolve(result) : reject(error))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      const result = await streamUpload();
      imageUrl = result.secure_url;
    }

    const doctor = await Doctor.create({ _id, name, email, phone, image: imageUrl });
    res.status(201).json({ message: "Doctor added", doctor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// تحديث دكتور مع صورة
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.file) {
      const streamUpload = () => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "uploads" },
          (error, result) => (result ? resolve(result) : reject(error))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      const result = await streamUpload();
      updates.image = result.secure_url;
    }

    const doc = await Doctor.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    res.json({ message: "Doctor updated", doctor: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// حذف دكتور
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Doctor.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    res.json({ message: "Doctor removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
