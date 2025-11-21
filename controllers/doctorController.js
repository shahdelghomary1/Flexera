// controllers/doctorController.js
import Doctor from "../models/doctorModel.js";
import fs from "fs";
import path from "path";

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
    const image = req.file ? req.file.filename : null;

    if (!_id || !name || !email || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await Doctor.findOne({ email });
    if (exists) return res.status(400).json({ message: "Doctor email already exists" });

    const doctor = await Doctor.create({ _id, name, email, phone, image });
    res.status(201).json({ message: "Doctor added", doctor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// تحديث بيانات دكتور + صورة
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.file) updates.image = req.file.filename;

    const doc = await Doctor.findOne({ _id: id });
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    // حذف الصورة القديمة لو متغيرة
    if (updates.image && doc.image) {
      const oldPath = path.join("uploads", doc.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updatedDoc = await Doctor.findOneAndUpdate({ _id: id }, updates, { new: true });
    res.json({ message: "Doctor updated", doctor: updatedDoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// حذف دكتور

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Doctor.findById(id);
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    // حذف الصورة لو موجودة
    if (doc.image) {
      const imagePath = path.join("uploads", doc.image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    // استخدام findByIdAndDelete بدل remove
    await Doctor.findByIdAndDelete(id);

    res.json({ message: "Doctor removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};