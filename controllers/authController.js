// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import streamifier from "streamifier";
import Schedule from "../models/scheduleModel.js";

import User from "../models/userModel.js";
import { sendOTPEmail } from "../utils/mailer.js"; 
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import Doctor from "../models/doctorModel.js";
const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const signTokenWithRole = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "flexera" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const updateAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    
    let updateData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      gender: req.body.gender,
      dob: req.body.dob,
      height: req.body.height,
      weight: req.body.weight,
    };

    
    if (req.files?.image) {
      const imageUrl = await uploadToCloudinary(req.files.image[0].buffer);
      updateData.image = imageUrl;
    }

    
    if (req.files?.medicalFile) {
      const medicalFileUrl = await uploadToCloudinary(req.files.medicalFile[0].buffer);
      updateData.medicalFile = medicalFileUrl;
    }


    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password"); 

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Account updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, role: roleFromFront } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (roleFromFront && user.role !== roleFromFront) {
      return res.status(403).json({ message: "Wrong role for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = signTokenWithRole(user);
    const { password: pw, ...userData } = user._doc;
    res.json({ token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= GOOGLE AUTH =====================

export const googleOAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "No credential provided" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    let user = await User.findOne({ email });

    let isNewUser = false;

    if (!user) {
      user = await User.create({
        name,
        email,
        image: picture,
        password: sub,
        role: "user",
      });
      isNewUser = true;
    }

    const token = signTokenWithRole(user);
    const { password, ...userData } = user._doc;

    res.status(200).json({
      message: isNewUser
        ? "Google signup successful"
        : "Google login successful",
      status: isNewUser ? "signup" : "login",
      token,
      user: userData,
    });

  } catch (err) {
    console.error("Google OAuth error:", err);
    res.status(500).json({
      message: "Google OAuth failed",
      error: err.message,
    });
  }
};

export const googleOAuthFlutter = async (req, res) => {
  try {
    const { idToken, platform } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "No idToken provided" });
    }

 
    let audience = platform === "ios"
      ? process.env.GOOGLE_CLIENT_ID_IOS
      : process.env.GOOGLE_CLIENT_ID_ANDROID;

    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        name,
        email,
        image: picture,
        password: sub,
        role: "user",
      });
      isNewUser = true;
    }

    const token = signTokenWithRole(user);
    const { password, ...userData } = user._doc;

    res.status(200).json({
      message: isNewUser
        ? "Google signup successful"
        : "Google login successful",
      status: isNewUser ? "signup" : "login",
      token,
      user: userData,
    });

  } catch (err) {
    console.error("Google OAuth error (Flutter):", err);
    res.status(500).json({
      message: "Google OAuth failed",
      error: err.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString(); 
    user.resetOTP = hashOTP(otp);
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();

    await sendOTPEmail(email, otp);

   
    const tempToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "10m" });

    return res.status(200).json({ message: "OTP sent to email", tempToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifyOTP = async (req, res) => {
  const { otp } = req.body;
  const tempToken = req.headers.authorization?.split(" ")[1]; // إرسال token في الهيدر

  if (!tempToken) return res.status(400).json({ message: "Temp token required" });

  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.resetOTP || !user.resetOTPExpires) {
      return res.status(400).json({ message: "No OTP requested" });
    }
    if (Date.now() > user.resetOTPExpires) {
      user.resetOTP = undefined;
      user.resetOTPExpires = undefined;
      await user.save();
      return res.status(400).json({ message: "OTP expired" });
    }

    if (hashOTP(otp) !== user.resetOTP) return res.status(400).json({ message: "Invalid OTP" });

    // توليد resetToken النهائي لصفحة تغيير كلمة المرور
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return res.status(200).json({ message: "OTP verified", resetToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  console.log("RESET BODY:", req.body);
  console.log("RESET HEADERS:", req.headers);

  const { newPassword, confirmPassword } = req.body;
  const resetToken = req.headers.authorization?.split(" ")[1];

  console.log("RESET TOKEN:", resetToken);

  if (!resetToken) return res.status(400).json({ message: "Reset token required" });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    console.log("DECODED:", decoded);

    const user = await User.findById(decoded.id);
    console.log("USER FOUND:", user);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;

    await user.save();
    console.log("PASSWORD UPDATED");

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("RESET ERROR:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset token expired" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};


export const registerUser = async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  try {
  
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    
    const user = new User({
      name,
      email,
      password, 
      role: role || "user",
    });
    await user.save();

  
    const { password: pw, ...userData } = user._doc;
    const token = signTokenWithRole(user);

    res.status(201).json({ message: "User registered", token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getDoctorsForUser = async (req, res) => {
  try {
    
    const doctors = await Doctor.find()
      .select("name  image ") 
      .sort({ name: 1 }); 

    res.status(200).json({ doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDoctorScheduleForUser = async (req, res) => {
  try {
    const doctorId = req.query.doctorId;
    if (!doctorId) return res.status(400).json({ message: "doctorId is required" });

    const doctor = await Doctor.findById(doctorId).select("name image price _id");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const schedules = await Schedule.find({ doctor: doctorId })
      .select("date timeSlots")
      .sort({ date: 1 });

    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule._id,
      date: schedule.date,
      timeSlots: schedule.timeSlots.map(slot => ({
        from: slot.from,
        to: slot.to,
        _id: slot._id
      })),
      doctor: {
        _id: doctor._id, 
        name: doctor.name,
        image: doctor.image,
        price: doctor.price
      }
    }));

    res.status(200).json({
      message: "Doctor schedule fetched for user",
      schedules: formattedSchedules
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getUserExercises = async (req, res) => {
  try {
    const userId = req.user._id;

    const schedules = await Schedule.find({ user: userId })
      .select("exercises date doctor") 
      .populate("doctor", "name image");

    res.status(200).json({
      message: "User exercises fetched",
      exercises: schedules,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const logoutUser = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


export const getUserLastPaidAppointment = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. استخدام populate لجلب بيانات الطبيب (الاسم والصورة) مباشرةً
    const schedules = await Schedule.find({
      "timeSlots.bookedBy": userId,
      "timeSlots.paymentStatus": "paid"
    })
      .populate({
        path: "doctor",
        select: "name image" // لجلب الاسم والصورة فقط من نموذج الطبيب
      })
      .sort({ "timeSlots.bookingTime": -1 });

    if (!schedules.length) {
      return res.json({
        success: false,
        message: "No paid appointments found"
      });
    }

    let lastSlot = null;

    // 2. البحث عن آخر حجز مدفوع بنجاح
    for (const schedule of schedules) {
      // التأكد من أن حقل doctor تم تعبئته بنجاح
      if (!schedule.doctor) {
          console.warn(`Doctor data missing for schedule ID: ${schedule._id}`);
          continue; // تخطي الجدول الذي لا يحتوي بيانات طبيب صالحة
      }
      
      const paidSlots = schedule.timeSlots
        .filter(
          (s) =>
            s.bookedBy?.toString() === userId.toString() &&
            s.paymentStatus === "paid"
        )
        // يجب أن يحتوي الـ timeSlot على حقل bookingTime ليتم الفرز بشكل صحيح
        .sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime)); 

      if (paidSlots.length) {
        lastSlot = {
          schedule,
          slot: paidSlots[0]
        };
        break; // وجدنا أحدث موعد، نوقف التكرار
      }
    }

    if (!lastSlot) {
      return res.json({
        success: false,
        message: "No valid paid appointment found"
      });
    }

    const { schedule, slot } = lastSlot;

    // 3. استخدام بيانات الطبيب المعبأة
    const doctorData = schedule.doctor; // الآن هو كائن يحتوي على { _id, name, image }

    return res.json({
      success: true,
      appointment: {
        doctor: {
          code: doctorData._id, // المعرف (الكود)
          name: doctorData.name, // الاسم المطلوب
          image: doctorData.image // الصورة المطلوبة
        },
        date: schedule.date,
        time: `${slot.from} - ${slot.to}`,
        from: slot.from,
        to: slot.to,
        paymentStatus: slot.paymentStatus,
        orderId: slot.orderId
      }
    });

  } catch (err) {
    console.error("Error fetching last paid appointment:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
