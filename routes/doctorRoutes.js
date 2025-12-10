import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import { updateDoctorAccount, getAllDoctors, doctorSignup, doctorForgotPassword, doctorVerifyOTP,
  doctorResetPassword,doctorLogin,logoutDoctor , getDoctorAccount,updateUserExercise,deleteUserExercise , getUserMedicalFileWithExercises,
 deleteTimeSlot} from "../controllers/doctorController.js";
import { addDoctorSchema, updateDoctorSchema, doctorSignupSchema, doctorResetPasswordSchema } from "../validators/doctorValidation.js";
import { getAppointmentsForDoctor} from "../controllers/scheduleController.js";
import {
  getAllPaidPatients,
   getUpcomingPaidPatients,
   getPastPaidPatients  ,
} from "../controllers/doctorController.js";
import { validate } from "../middleware/validate.js";
import Doctor from "../models/doctorModel.js";
import Schedule from "../models/scheduleModel.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const router = express.Router();
// appointments for doctor not working aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
router.get("/appointments", protect(["doctor"]), getAppointmentsForDoctor);



// deshboard for staff to manage doctors
router.get("/", protect(), authorize("staff"), getAllDoctors);
router.post("/", protect(["staff"]), authorize("staff"), upload.single("image"), validate(addDoctorSchema), async (req, res) => {
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
      console.log(`📢 Triggering doctorAdded notification for: ${doctor.name}`);
      await notificationService.doctorAdded(doctor);
    } else {
      console.error("❌ NotificationService not found in req.app");
    }

    res.status(201).json({ success: true, message: "Doctor added", doctor });

  } catch (err) {
    console.error("Add doctor error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
  

// for doctor auth and account management
router.post("/signup",validate(doctorSignupSchema ), doctorSignup);
router.post("/login", doctorLogin);
router.post("/forgot-password", doctorForgotPassword);
router.post("/verify-otp", doctorVerifyOTP);
router.post("/reset-password", validate(doctorResetPasswordSchema), doctorResetPassword);
router.put("/account", protect(["doctor"]), upload.single("image"), validate(updateDoctorSchema), updateDoctorAccount);
router.get("/account", protect(["doctor"]), getDoctorAccount);
router.delete( "/schedule/:scheduleId/slot/:slotId", protect(["doctor"]), deleteTimeSlot);

// paid patients and their appointments
router.get("/all-paid-patients", protect(["doctor"]), getAllPaidPatients);
router.get("/past-paid-appointments", protect(["doctor"]), getPastPaidPatients  );
router.get("/upcoming-paid-appointments", protect(["doctor"]),  getUpcomingPaidPatients);

//exercises to user
router.post("/users/:userId/exercises", protect(["doctor"]), async (req, res) => {
  try {
    const { userId } = req.params;
    const { exercises } = req.body;

    if (!exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ success: false, message: "Exercises must be an array" });
    }

    let schedule = await Schedule.findOne({ 
      user: userId, 
      doctor: req.user._id 
    });

    if (!schedule) {
      schedule = await Schedule.create({
        user: userId,
        doctor: req.user._id,
        date: new Date().toISOString().split('T')[0], 
        timeSlots: [],
        exercises: []
      });
    }

    schedule.exercises.push(...exercises);
    await schedule.save();

    // إرسال إشعار للمستخدم عند إضافة تمارين جديدة
    const notificationService = req.app.get("notificationService");
    if (notificationService) {
      // جلب اسم الدكتور لإضافته في رسالة الإشعار
      const doctor = await Doctor.findById(req.user._id);
      const doctorName = doctor ? doctor.name : "الدكتور";
      
      console.log(`📢 Triggering exercisesAdded notification for user: ${userId}`);
      await notificationService.notifyUser(userId, "notification:newExercises", {
        message: `تم إضافة تمارين جديدة من ${doctorName}`,
        doctorId: req.user._id,
        doctorName: doctorName,
        exercisesCount: exercises.length,
        exercises: exercises
      });
    } else {
      console.error("❌ NotificationService not found in req.app");
    }

    res.status(200).json({ success: true, message: "Exercises added successfully", schedule });

  } catch (err) {
    console.error("Add exercises error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.put("/users/:userId/exercises/:exerciseId",protect(["doctor"]),updateUserExercise);
router.delete("/users/:userId/exercises/:exerciseId",protect(["doctor"]),deleteUserExercise);
router.get("/user/:userId/full", protect(["doctor"]), getUserMedicalFileWithExercises);


router.post("/logout/doctor", logoutDoctor);


export default router;
