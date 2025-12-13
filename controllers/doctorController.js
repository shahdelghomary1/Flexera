import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addSchedule } from "../controllers/scheduleController.js";
import Doctor from "../models/doctorModel.js";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";

import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Schedule from "../models/scheduleModel.js";
import { sendOTPEmail } from "../utils/mailer.js";
const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const router = express.Router();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const signToken = (doctor) => {
  return jwt.sign(
    { id: doctor._id, role: "doctor" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};



export const getAppointmentsForDoctor = async (req, res) => {
  try {
    const doctorId = req.query.doctorId;
    if (!doctorId) return res.status(400).json({ message: "doctorId is required" });

    let appointments = await Schedule.find({ doctor: doctorId })
      .populate("user", "name image medicalFile")
      .sort({ date: 1 });

    
   const formattedAppointments = appointments.map(appt => ({
  _id: appt._id,
  date: appt.date || "",
  timeSlots: appt.timeSlots?.map(slot => ({
    from: slot.from,
    to: slot.to,
    _id: slot._id
  })) || [],
  user: appt.user ? {
    _id: appt.user._id,
    name: appt.user.name || "",
    image: appt.user.image || "",
    medicalFile: appt.user.medicalFile || ""
  } : {}
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





/// for doctor signup, login, forgot password, verify OTP, reset password -----------------------------------------------------------------

export const doctorSignup = async (req, res) => {
  try {
    const { _id, email, name, password, confirmPassword } = req.body;

    if (!_id || !email || !name || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const doctor = await Doctor.findById(_id);
    if (!doctor) return res.status(404).json({ message: "Doctor ID not found" });

    
   if (doctor.password) {
  return res.status(400).json({ message: "Doctor already signed up" });
}


   
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


// Update Doctor Account &  get doctor account -----------------------------------------------------------------
export const updateDoctorAccount = async (req, res) => {
  try {
    const doctorId = req.user.id;
    let doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // ====== PREVENT UPDATE ======
    if (req.body.price !== undefined) {
      delete req.body.price;
    }

    const {
      name,
      email,
      phone,
      dateOfBirth,
      gender,
      oldPassword,
      newPassword,
    } = req.body;

  

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 3) {
        return res.status(400).json({
          message: "Name must be at least 3 characters",
        });
      }
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: "Invalid email format",
        });
      }
    }

    if (phone !== undefined) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          message: "Phone number must be 10 to 15 digits",
        });
      }
    }

    if (gender !== undefined) {
      if (!["Male", "Female"].includes(gender)) {
        return res.status(400).json({
          message: "Gender must be Male or Female",
        });
      }
    }

    if (dateOfBirth !== undefined) {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({
          message: "Invalid date of birth",
        });
      }
    }

    if (newPassword !== undefined) {
      if (!oldPassword) {
        return res.status(400).json({
          message: "Old password is required",
        });
      }

      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({
          message: "New password must be at least 8 characters",
        });
      }

      const isMatch = await bcrypt.compare(oldPassword, doctor.password);
      if (!isMatch) {
        return res.status(400).json({
          message: "Old password is incorrect",
        });
      }

      doctor.password = newPassword;
    }

    // ====== UPDATE FIELDS ======

    const updatableFields = ["name", "email", "phone", "gender"];
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        doctor[field] = req.body[field];
      }
    });

    if (dateOfBirth !== undefined) {
      doctor.dateOfBirth = new Date(dateOfBirth);
    }

    // ====== IMAGE UPLOAD ======

    if (req.file) {
      const uploadToCloudinary = (buffer, folder) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) =>
              result ? resolve(result.secure_url) : reject(error)
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const uploadedUrl = await uploadToCloudinary(
        req.file.buffer,
        "uploads/doctors"
      );

      doctor.image = uploadedUrl;
    }

    await doctor.save();

    doctor = doctor.toObject();
    delete doctor.price;
    delete doctor.password;

    res.status(200).json({
      message: "Doctor account updated successfully",
      doctor,
    });
  } catch (err) {
    console.error("UPDATE DOCTOR ACCOUNT ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};


export const getDoctorAccount = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const doctor = await Doctor.findById(doctorId).select("-password -price "); 
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.status(200).json({
      message: "Doctor account fetched successfully",
      doctor,
    });

  } catch (err) {
    console.error("GET DOCTOR ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const addExercisesToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { exercises } = req.body;

 
    if (!exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ 
        success: false, 
        message: "Exercises must be an array" 
      });
    }

  
    for (const ex of exercises) {
      if (!ex.category) {
        return res.status(400).json({
          success: false,
          message: "Category is required for each exercise"
        });
      }
      if (!ex.name) {
        return res.status(400).json({
          success: false,
          message: "Name is required for each exercise"
        });
      }
    }


    let schedule = await Schedule.findOne({
      user: userId,
      doctor: req.user._id
    });

    if (!schedule) {
      schedule = await Schedule.create({
        user: userId,
        doctor: req.user._id,
        date: new Date().toISOString().split("T")[0],
        timeSlots: [],
        exercises: []
      });
    }


    schedule.exercises = schedule.exercises.map((ex) => ({
      ...ex.toObject(),
      category: ex.category || "general"  
    }));

 
    schedule.exercises.push(...exercises);


    await schedule.save();

    const notificationService = req.app.get("notificationService");

    if (notificationService) {
      const doctor = await Doctor.findById(req.user._id);
      const doctorName = doctor ? doctor.name : "doctor";

      console.log(` Triggering exercisesAdded notification for user: ${userId}`);

      await notificationService.notifyUser(
        userId,
        "notification:newExercises",
        {
          message: ` add D${doctorName} new exercises to your schedule`,
          title: " new exerice ",
          doctorId: req.user._id,
          doctorName: doctorName,
          exercisesCount: exercises.length,
          exercises: exercises
        },
        true, 
        true  
      );
    } else {
      console.error(" NotificationService not found in req.app");
    }

    res.status(200).json({
      success: true,
      message: "Exercises added successfully",
      schedule
    });

  } catch (err) {
    console.error("Add exercises error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


export const updateUserExercise = async (req, res) => {
  try {
    const { userId, exerciseId } = req.params;
    const doctorId = req.user._id;

    let schedule = await Schedule.findOne({ user: userId, doctor: doctorId });
    if (!schedule) return res.status(404).json({ message: "Schedule not found for this doctor" });

    const exerciseIndex = schedule.exercises.findIndex(ex => ex._id.toString() === exerciseId);
    if (exerciseIndex === -1) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // حفظ معلومات التمرين قبل التحديث
    const oldExercise = schedule.exercises[exerciseIndex].toObject();

    // لازم category لو الدكتور هيعدّلها
    if (req.body.category !== undefined && !req.body.category) {
      return res.status(400).json({ message: "Category cannot be empty" });
    }

    schedule.exercises[exerciseIndex] = {
      ...schedule.exercises[exerciseIndex].toObject(),
      ...req.body
    };

    await schedule.save();

    // إرسال إشعار للمستخدم
    const notificationService = req.app.get("notificationService");
    if (notificationService) {
      const doctor = await Doctor.findById(doctorId);
      const doctorName = doctor ? doctor.name : "doctor";
      const updatedExercise = schedule.exercises[exerciseIndex];

      await notificationService.notifyUser(
        userId,
        "notification:exerciseUpdated",
        {
          message: `تم تحديث تمرين "${updatedExercise.name || oldExercise.name}" من قبل د. ${doctorName}`,
          title: "تم تحديث التمرين",
          doctorId: doctorId,
          doctorName: doctorName,
          exerciseId: exerciseId,
          exerciseName: updatedExercise.name || oldExercise.name,
          exerciseCategory: updatedExercise.category || oldExercise.category,
          oldExercise: oldExercise,
          updatedExercise: updatedExercise
        },
        true, // saveToDB
        true  // sendFirebase
      );
    }

    res.status(200).json({ message: "Exercise updated", schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


 
export const deleteUserExercise = async (req, res) => {
  try {
    const { userId, exerciseId } = req.params;
    const doctorId = req.user._id;

    let schedule = await Schedule.findOne({ user: userId, doctor: doctorId });
    if (!schedule) return res.status(404).json({ message: "Schedule not found for this doctor" });

    const initialLength = schedule.exercises.length;

    // حفظ معلومات التمرين قبل الحذف
    const deletedExercise = schedule.exercises.find(
      ex => ex._id.toString() === exerciseId
    );

    schedule.exercises = schedule.exercises.filter(
      ex => ex._id.toString() !== exerciseId
    );

    if (schedule.exercises.length === initialLength) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    await schedule.save();

    // إرسال إشعار للمستخدم
    const notificationService = req.app.get("notificationService");
    if (notificationService && deletedExercise) {
      const doctor = await Doctor.findById(doctorId);
      const doctorName = doctor ? doctor.name : "doctor";

      await notificationService.notifyUser(
        userId,
        "notification:exerciseDeleted",
        {
          message: `تم حذف تمرين "${deletedExercise.name || 'تمرين'}" من قبل د. ${doctorName}`,
          title: "تم حذف التمرين",
          doctorId: doctorId,
          doctorName: doctorName,
          exerciseId: exerciseId,
          exerciseName: deletedExercise.name || "تمرين",
          exerciseCategory: deletedExercise.category || "general",
          deletedExercise: deletedExercise
        },
        true, // saveToDB
        true  // sendFirebase
      );
    }

    res.status(200).json({ message: "Exercise deleted", schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const getUserMedicalFileWithExercises = async (req, res) => {
  try {
    const { userId } = req.params;
    const doctorId = req.user.id;

    if (!userId) return res.status(400).json({ message: "userId is required" });

   
    const user = await User.findById(userId).select("name image medicalFile");
    if (!user) return res.status(404).json({ message: "User not found" });

    
    const schedule = await Schedule.findOne({
      user: userId,
      $or: [
        { doctor: doctorId }, 
        { doctor: doctorId.toString() } 
      ]
    }).select("exercises date");

    res.status(200).json({
      message: "User medical file and your exercises fetched successfully",
      user,
      exercises: schedule?.exercises || [],
      scheduleDate: schedule?.date || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
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
export const addDoctor = async (req, res) => {
  try {
    const { _id, name, email, phone, price } = req.body;

    if (!_id || !name || !email || !phone || price == null) {
      return res.status(400).json({ success: false, message: "All fields including price are required" });
    }

    const idExists = await Doctor.findById(_id);
    if (idExists) {
      return res.status(400).json({ success: false, message: "Doctor ID already exists" });
    }

    const emailExists = await Doctor.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: "Doctor email already exists" });
    }

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

 
    const notificationService = req.app.get("notificationService");
    if (notificationService) {
      console.log(` Triggering doctorAdded notification for: ${doctor.name}`);
      await notificationService.doctorAdded(doctor);
    } else {
      console.error(" NotificationService not found in req.app");
    }

    res.status(201).json({ success: true, message: "Doctor added", doctor });

  } catch (err) {
    console.error("Add doctor error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getAllDoctors = async (req, res) => {
  try {
    console.log("Reached getAllDoctors route"); 

    const doctors = await Doctor.find()
      .select("name email phone price image _id") 
      .sort({ createdAt: -1 });

    res.json({ doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteTimeSlot = async (req, res) => {
  try {
    const { scheduleId, slotId } = req.params;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

  
    const exists = schedule.timeSlots.some(
      slot => slot._id.toString() === slotId
    );
    if (!exists) {
      return res.status(404).json({ message: "Time slot not found" });
    }

   
    schedule.timeSlots = schedule.timeSlots.filter(
      slot => slot._id.toString() !== slotId
    );

    await schedule.save();

    res.json({
      message: "Time slot deleted successfully",
      schedule,
    });
  } catch (err) {
    console.error("DELETE TIME SLOT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const logoutDoctor = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0), sameSite: "strict" });
  res.json({ message: "Doctor logged out successfully" });
};


export const getAllPaidPatients = async (req, res) => {
  try {
    const doctorId = req.user._id; 

    const schedules = await Schedule.find({ doctor: doctorId }).populate(
      "timeSlots.bookedBy",
      "_id name email image"
    );

    const patientsMap = new Map();

    schedules.forEach((schedule) => {
      schedule.timeSlots.forEach((slot) => {
        if (slot.isBooked && slot.paymentStatus === "paid" && slot.bookedBy) {
          const userId = slot.bookedBy._id.toString();

          if (!patientsMap.has(userId)) {
            patientsMap.set(userId, {
              user: slot.bookedBy,
              appointments: [],
            });
          }

          patientsMap.get(userId).appointments.push({
            scheduleId: schedule._id,
            date: schedule.date,
            time: `${slot.from} - ${slot.to}`,
            orderId: slot.orderId,
          });
        }
      });
    });

    const patients = Array.from(patientsMap.values());

    res.json({ success: true, patients });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUpcomingPaidPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const now = new Date();

    const schedules = await Schedule.find({ doctor: doctorId }).populate(
      "timeSlots.bookedBy",
      "_id name email image"
    );

    const patientsMap = new Map();

    schedules.forEach((schedule) => {
      schedule.timeSlots.forEach((slot) => {
       
        const [year, month, day] = schedule.date.split('-');
        const slotDateTime = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${slot.from}:00`);

     
        if (slot.isBooked && slot.paymentStatus === "paid" && slot.bookedBy && slotDateTime >= now) {
          const userId = slot.bookedBy._id.toString();

          if (!patientsMap.has(userId)) {
            patientsMap.set(userId, {
              user: slot.bookedBy,
              upcoming: [],
            });
          }

         
          patientsMap.get(userId).upcoming.push({
            scheduleId: schedule._id,
            date: schedule.date,
            time: `${slot.from} - ${slot.to}`,
            orderId: slot.orderId,
            status: "Confirmed",
          });
        }
      });
    });

    const patients = Array.from(patientsMap.values());

    res.json({ success: true, patients });
  } catch (err) {
    console.error("Error in getUpcomingPaidPatients:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getPastPaidPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const now = new Date();

    const schedules = await Schedule.find({ doctor: doctorId }).populate(
      "timeSlots.bookedBy",
      "_id name email image"
    );

    const patientsMap = new Map();

    schedules.forEach((schedule) => {
      schedule.timeSlots.forEach((slot) => {
        
        const [year, month, day] = schedule.date.split('-');
        const slotDateTime = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${slot.from}:00`);

        if (slot.isBooked && slot.paymentStatus === "paid" && slot.bookedBy && slotDateTime < now) {
          const userId = slot.bookedBy._id.toString();

          if (!patientsMap.has(userId)) {
            patientsMap.set(userId, {
              user: slot.bookedBy,
              past: [],
            });
          }

          patientsMap.get(userId).past.push({
            scheduleId: schedule._id,
            date: schedule.date,
            time: `${slot.from} - ${slot.to}`,
            orderId: slot.orderId,
            status: "Completed",
          });
        }
      });
    });

    const patients = Array.from(patientsMap.values());

    res.json({ success: true, patients });
  } catch (err) {
    console.error("Error in getPastPaidPatients:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

