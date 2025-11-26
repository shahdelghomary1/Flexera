import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addSchedule } from "../controllers/scheduleController.js";
import Doctor from "../models/doctorModel.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Schedule from "../models/scheduleModel.js";
import { sendOTPEmail } from "../utils/mailer.js";
const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});




export const updateDoctorAccount = async (req, res) => {
  try {
    const doctorId = req.user.id; // doctor logged in (from protect middleware)

    let doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const { name, email, phone, price, oldPassword, newPassword } = req.body;

    // ----------------------------
    // 1️⃣ Update basic fields
    // ----------------------------
    if (name) doctor.name = name;
    if (email) {
      // Check duplicate email
      const emailExists = await Doctor.findOne({ email });
      if (emailExists && emailExists._id.toString() !== doctorId) {
        return res.status(400).json({ message: "Email already used" });
      }
      doctor.email = email;
    }
    if (phone) doctor.phone = phone;
    if (price !== undefined) doctor.price = price;

    // ----------------------------
    // 2️⃣ Update password (optional)
    // ----------------------------
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ message: "Old password is required" });
      }

      const isMatch = await bcrypt.compare(oldPassword, doctor.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      doctor.password = newPassword; // middleware will hash it
    }

    // ----------------------------
    // 3️⃣ Update profile image
    // ----------------------------
    if (req.file) {
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "uploads/doctors" },
            (error, result) => (result ? resolve(result) : reject(error))
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      const uploadResult = await streamUpload();
      doctor.image = uploadResult.secure_url;
    }

    await doctor.save();

    res.status(200).json({
      message: "Doctor account updated successfully",
      doctor,
    });

  } catch (err) {
    console.error("UPDATE DOCTOR ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const getAppointmentsForDoctor = async (req, res) => {
  try {
    const doctorId = req.query.doctorId;
    if (!doctorId) return res.status(400).json({ message: "doctorId is required" });

    let appointments = await Schedule.find({ doctor: doctorId })
      .populate("user", "name image medicalFile")
      .sort({ date: 1 });

    // Ensure appointments array is valid
    appointments = (appointments || []).filter(appt => appt != null);

    const formattedAppointments = appointments.map((appt) => ({
      _id: appt._id,
      date: appt.date || null,
      timeSlots: Array.isArray(appt.timeSlots)
        ? appt.timeSlots.map(slot => ({
            from: slot.from,
            to: slot.to,
            _id: slot._id
          }))
        : [],
      user: appt.user ? {
        _id: appt.user._id,
        name: appt.user.name,
        image: appt.user.image,
        medicalFile: appt.user.medicalFile
      } : null
    }));

    if (formattedAppointments.length === 0) {
      return res.status(200).json({ message: "No users booked yet. Please check later." });
    }

    res.status(200).json({
      message: "Appointments fetched successfully",
      appointments: formattedAppointments
    });

  } catch (err) {
    console.error("GET APPOINTMENTS ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const addExercisesToAppointment = async (req, res) => {
  try {
    const { scheduleId } = req.params; 
    const { exercises } = req.body; 

    if (!exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ message: "Exercises must be an array" });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ message: "Appointment not found" });

    
    schedule.exercises.push(...exercises);
    await schedule.save();

    res.status(200).json({ message: "Exercises added successfully", schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


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

  
    if (!_id || !name || !email || !phone || price == null) {
      return res.status(400).json({ message: "All fields including price are required" });
    }

 
    const idExists = await Doctor.findById(_id);
    if (idExists) return res.status(400).json({ message: "Doctor ID already exists" });

   
    const emailExists = await Doctor.findOne({ email });
    if (emailExists) return res.status(400).json({ message: "Doctor email already exists" });


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




export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;  

    const updates = { ...req.body };

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
    console.error("DELETE DOCTOR ERROR:", err);
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

    
    let doctor = await Doctor.findById(_id);
    if (!doctor) return res.status(404).json({ message: "Doctor ID not found" });

   
    if (doctor.email && doctor.email !== email) {
      return res.status(400).json({ message: "Email does not match this ID" });
    }

    doctor.name = name;
    doctor.email = email;
    doctor.password = password; 
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

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    doctor.resetOTP = hashOTP(otp);
    doctor.resetOTPExpires = Date.now() + 10 * 60 * 1000; 
    await doctor.save();

    await sendOTPEmail(email, otp);

    
    const otpToken = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: "10m" });

    res.status(200).json({ message: "OTP sent to email", otpToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const doctorVerifyOTP = async (req, res) => {
  const { otp } = req.body;
  const otpToken = req.headers.authorization?.split(" ")[1]; 

  if (!otpToken) return res.status(400).json({ message: "OTP token required" });

  try {
    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
    const doctor = await Doctor.findById(decoded.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (!doctor.resetOTP || !doctor.resetOTPExpires) return res.status(400).json({ message: "No OTP requested" });
    if (Date.now() > doctor.resetOTPExpires) {
      doctor.resetOTP = undefined;
      doctor.resetOTPExpires = undefined;
      await doctor.save();
      return res.status(400).json({ message: "OTP expired" });
    }

    if (hashOTP(otp) !== doctor.resetOTP) return res.status(400).json({ message: "Invalid OTP" });

    const resetToken = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: "10m" });
    res.status(200).json({ message: "OTP verified", resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const doctorResetPassword = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token required" });
  }

  const resetToken = authHeader.split(" ")[1]; 
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword)
    return res.status(400).json({ message: "Passwords are required" });

  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

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
