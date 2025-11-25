import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addSchedule } from "../controllers/scheduleController.js";
import Doctor from "../models/doctorModel.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOTPEmail } from "../utils/mailer.js";

const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
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
    const { _id, name, email, phone, price } = req.body;

    // التأكد من requirements
    if (!_id || !name || !email || !phone || price == null) {
      return res.status(400).json({ message: "All fields including price are required" });
    }

    // التأكد إن الـ ID مش مستخدم
    const idExists = await Doctor.findById(_id);
    if (idExists) return res.status(400).json({ message: "Doctor ID already exists" });

    // التأكد إن الإيميل مش مستخدم
    const emailExists = await Doctor.findOne({ email });
    if (emailExists) return res.status(400).json({ message: "Doctor email already exists" });

    // رفع الصورة لو موجودة
    let imageUrl = null;

    if (req.file) {
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "uploads" },
            (error, result) => (result ? resolve(result) : reject(error))
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      const result = await streamUpload();
      imageUrl = result.secure_url;
    }

    // إنشاء الدكتور
    const doctor = await Doctor.create({
      _id,
      name,
      email,
      phone,
      image: imageUrl,
      price,
    });

    res.status(201).json({ message: "Doctor added", doctor });

  } catch (err) {
    console.error("ADD DOCTOR ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};




/*************  ✨ Windsurf Command ⭐  *************/
/*******  7b746ae3-5f0f-404c-98ec-edaba83769fd  *******/
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // لو في صورة جديدة
    if (req.file) {
      const streamUpload = () =>
        new Promise((resolve, reject) => {
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
    console.error("UPDATE DOCTOR ERROR:", err);
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



const signToken = (doctor) => {
  return jwt.sign(
    { id: doctor._id, role: "doctor" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};


export const doctorSignup = async (req, res) => {
  try {
    const { _id, email, name, password, confirmPassword } = req.body;

    if (!_id || !email || !name || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // تأكد من الـ ID موجود مسبقًا
    let doctor = await Doctor.findById(_id);
    if (!doctor) return res.status(404).json({ message: "Doctor ID not found" });

    // تحقق من أن الإيميل متطابق مع الـ ID
    if (doctor.email && doctor.email !== email) {
      return res.status(400).json({ message: "Email does not match this ID" });
    }

    doctor.name = name;
    doctor.email = email;
    doctor.password = password; // pre-save hook سيعمل hash تلقائي
    await doctor.save();

    const token = signToken(doctor);

    res.status(201).json({
      message: "Signup successful",
      doctor,
      token
    });

  } catch (err) {
    console.error("Signup error:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Duplicate field value",
        field: Object.keys(err.keyValue)[0],
        value: err.keyValue[Object.keys(err.keyValue)[0]]
      });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



export const doctorLogin = async (req, res) => {
  try {
    const { _id, email, password } = req.body;

    if (!_id || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const doctor = await Doctor.findById(_id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (doctor.email !== email) {
      return res.status(400).json({ message: "Email does not match this ID" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong password" });

    const token = signToken(doctor);

    res.json({
      message: "Login successful",
      doctor,
      token
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const doctorForgotPassword = async (req, res) => {
  const { _id, email } = req.body; 
  try {
    const doctor = await Doctor.findById(_id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (doctor.email !== email) return res.status(400).json({ message: "Email does not match ID" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    doctor.resetOTP = hashOTP(otp);
    doctor.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await doctor.save();

    await sendOTPEmail(email, otp);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const doctorVerifyOTP = async (req, res) => {
  const { _id, otp } = req.body;
  try {
    const doctor = await Doctor.findById(_id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (!doctor.resetOTP || !doctor.resetOTPExpires) return res.status(400).json({ message: "No OTP requested" });
    if (Date.now() > doctor.resetOTPExpires) {
      doctor.resetOTP = undefined;
      doctor.resetOTPExpires = undefined;
      await doctor.save();
      return res.status(400).json({ message: "OTP expired" });
    }

    if (hashOTP(otp) !== doctor.resetOTP) return res.status(400).json({ message: "Invalid OTP" });

    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: "10m" });
    res.status(200).json({ message: "OTP verified", resetToken: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const doctorResetPassword = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;
  if (!resetToken) return res.status(400).json({ message: "Reset token required" });
  if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const doctor = await Doctor.findById(decoded.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    doctor.password = newPassword;
    doctor.resetOTP = undefined;
    doctor.resetOTPExpires = undefined;
    await doctor.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateDoctorAccount = async (req, res) => {

  try {
     console.log(" Updating doctor account");
    console.log("User from token:", req.user);
    console.log("Body:", req.body);
    console.log("File:", req.file);
    const doctorId = req.user._id;

    const updateFields = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
    };

    if (req.file) {
      const streamUpload = (req) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream((error, result) => {
            if (result) resolve(result);
            else reject(error);
          });
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const uploadedImage = await streamUpload(req);
      updateFields.image = uploadedImage.secure_url;
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorId,
      updateFields,
      { new: true }
    );

    res.json({
      message: "Account updated successfully",
      doctor: updatedDoctor
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getDoctorsForUser = async (req, res) => {
  try {
    
    const doctors = await Doctor.find().select("name image"); 
  
    res.status(200).json({ doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const router = express.Router();

router.post("/", protect(["doctor"]), addSchedule);

export default router;
