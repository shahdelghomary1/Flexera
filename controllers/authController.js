// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/userModel.js";
import { sendOTPEmail } from "../utils/mailer.js"; // افترضت إن عندك utils/mailer.js

const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

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

    // optional: ensure role matches what user selected in UI (login form chooses Staff/User)
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

export const googleAuth = async (req, res) => {
  const { email, name, googleId } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: googleId,
        role: "user",
      });
    }

    const token = signTokenWithRole(user);
    const { password: pw, ...userData } = user._doc;
    res.json({ token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// forgotPassword, verifyOTP, resetPassword — كما في كودك السابق، ضفت هنا للتماشي:
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = hashOTP(otp);
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOTPEmail(email, otp);
    return res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
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
    const hashed = hashOTP(otp);
    if (hashed !== user.resetOTP) return res.status(400).json({ message: "Invalid OTP" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return res.status(200).json({ message: "OTP verified", resetToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // الطريقة الصحيحة: نستخدم new User + save() عشان pre-save hook يشغّل
    const user = new User({
      name,
      email,
      password, // pre-save hook هيشفّر الباسورد
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

export const resetPassword = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;
  if (!resetToken) return res.status(400).json({ message: "Reset token required" });
  if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword; // pre-save hook هاش الباسورد تلقائيًا
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
