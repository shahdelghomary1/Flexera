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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const signTokenWithRole = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
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


// export const googleOAuthFlutter = async (req, res) => {
//   try {
//     const { idToken, platform } = req.body;

//     if (!idToken) {
//       return res.status(400).json({ message: "No idToken provided" });
//     }

 
//     let audience = platform === "ios"
//       ? process.env.GOOGLE_CLIENT_ID_IOS
//       : process.env.GOOGLE_CLIENT_ID_ANDROID;

//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience,
//     });

//     const payload = ticket.getPayload();
//     const { email, name, picture, sub } = payload;

//     let user = await User.findOne({ email });
//     let isNewUser = false;

//     if (!user) {
//       user = await User.create({
//         name,
//         email,
//         image: picture,
//         password: sub,
//         role: "user",
//       });
//       isNewUser = true;
//     }

//     const token = signTokenWithRole(user);
//     const { password, ...userData } = user._doc;

//     res.status(200).json({
//       message: isNewUser
//         ? "Google signup successful"
//         : "Google login successful",
//       status: isNewUser ? "signup" : "login",
//       token,
//       user: userData,
//     });

//   } catch (err) {
//     console.error("Google OAuth error (Flutter):", err);
//     res.status(500).json({
//       message: "Google OAuth failed",
//       error: err.message,
//     });
//   }
// };


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

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Resets the user's password after verifying the reset token.
 * @param {Object} req.body - request body containing resetToken, newPassword, and confirmPassword.
 * @returns {Promise<Object>} - response with message and status code.
 */
/*******  0a0bb27f-961e-4e98-b7af-92bfdc2077a9  *******/
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







export const updateAccount = async (req, res) => {
  console.log("req.user:", req.user);
console.log("req.user?._id:", req.user?._id);
console.log("Is valid ObjectId:", mongoose.Types.ObjectId.isValid(req.user?._id));

  try {
    
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, phone, password, dob, gender, height, weight } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;
    if (height) user.height = height;
    if (weight) user.weight = weight;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }


    if (req.files) {
      const uploadToCloudinary = (file, folder) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url);
          });
          streamifier.createReadStream(file[0].buffer).pipe(stream);
        });

      if (req.files.image) {
        user.image = await uploadToCloudinary(req.files.image, "users/images");
      }
      if (req.files.medicalFile) {
        user.medicalFile = await uploadToCloudinary(req.files.medicalFile, "users/medical");
      }
    }

    await user.save();

    const { password: pw, ...userData } = user._doc;
    res.status(200).json({ message: "Account updated successfully", user: userData });
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

// GET /api/user/doctor-schedule?doctorId=xxx
export const getDoctorScheduleForUser = async (req, res) => {
  try {
    const doctorId = req.query.doctorId;
    if (!doctorId) return res.status(400).json({ message: "doctorId is required" });

    const schedules = await Schedule.find({ doctor: doctorId })
      .select("date timeSlots")  
      .sort({ date: 1 });       
    res.status(200).json({
      message: "Doctor schedule fetched for user",
      schedules
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};