// controllers/adminController.js
import Doctor from "../models/doctorModel.js";
import User from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json({ doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addDoctor = async (req, res) => {
  try {
    const { name, email, speciality, phone, bio } = req.body;
    const exists = await Doctor.findOne({ email });
    if (exists) return res.status(400).json({ message: "Doctor email already exists" });

    const doctor = await Doctor.create({ name, email, speciality, phone, bio });
    res.status(201).json({ message: "Doctor added", doctor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

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


export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };
    if (req.file) {
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "doctors" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      const result = await streamUpload();
      updates.image = result.secure_url;
    }

    const doctor = await Doctor.findByIdAndUpdate(id, updates, { new: true });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json({ message: "Doctor updated", doctor });

  } catch (err) {
    console.error("UPDATE DOCTOR ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getAllUsers = async (req, res) => {
  try {
    // استرجاع كل المستخدمين ما عدا هذا الإيميل
    const users = await User.find({ email: { $ne: "staffflexera@gmail.com" } })
      .select("name email phone dob image")
      .lean();

    const usersWithAge = users.map(user => {
      const age = user.dob
        ? new Date().getFullYear() - new Date(user.dob).getFullYear()
        : null;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "N/A",
        age,
        image: user.image || null,
      };
    });

    res.json({ users: usersWithAge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const logoutStaff = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0), sameSite: "strict" });
  res.json({ message: "Staff logged out successfully" });
};
