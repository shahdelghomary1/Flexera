import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import {
  updateDoctorAccount, getAllDoctors, addDoctor, doctorSignup, doctorForgotPassword,
  doctorVerifyOTP, doctorResetPassword, doctorLogin, logoutDoctor, getDoctorAccount,
  addExercisesToUser, updateUserExercise, deleteUserExercise,
  getUserMedicalFileWithExercises, deleteTimeSlot, updateDoctor,
  getAllPaidPatients, getUpcomingPaidPatients, getPastPaidPatients
} from "../controllers/doctorController.js";
import { addDoctorSchema, doctorSignupSchema, doctorResetPasswordSchema } from "../validators/doctorValidation.js";
import { getAppointmentsForDoctor } from "../controllers/scheduleController.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

/* ------------------ STATIC DOCTOR ROUTES (MUST BE FIRST) ------------------ */

// Doctor account
router.put("/account", protect(["doctor"]), upload.single("image"), updateDoctorAccount);
router.get("/account", protect(["doctor"]), getDoctorAccount);

// Doctor appointments
router.get("/appointments", protect(["doctor"]), getAppointmentsForDoctor);

// Paid patients
router.get("/all-paid-patients", protect(["doctor"]), getAllPaidPatients);
router.get("/past-paid-appointments", protect(["doctor"]), getPastPaidPatients);
router.get("/upcoming-paid-appointments", protect(["doctor"]), getUpcomingPaidPatients);

// Exercises
router.post("/users/:userId/exercises", protect(["doctor"]), addExercisesToUser);
router.put("/users/:userId/exercises/:exerciseId", protect(["doctor"]), updateUserExercise);
router.delete("/users/:userId/exercises/:exerciseId", protect(["doctor"]), deleteUserExercise);
router.get("/user/:userId/full", protect(["doctor"]), getUserMedicalFileWithExercises);

// Delete time slot
router.delete("/schedule/:scheduleId/slot/:slotId", protect(["doctor"]), deleteTimeSlot);

// Auth
router.post("/signup", validate(doctorSignupSchema), doctorSignup);
router.post("/login", doctorLogin);
router.post("/forgot-password", doctorForgotPassword);
router.post("/verify-otp", doctorVerifyOTP);
router.post("/reset-password", validate(doctorResetPasswordSchema), doctorResetPassword);

// Logout
router.post("/logout/doctor", logoutDoctor);

/* ------------------ STAFF ROUTES ------------------ */

router.get("/", protect(), authorize("staff"), getAllDoctors);
router.post("/", protect(["staff"]), authorize("staff"), upload.single("image"), validate(addDoctorSchema), addDoctor);

/* ------------------ DYNAMIC ROUTES MUST BE LAST ------------------ */

router.put("/:id", protect(["staff"]), authorize("staff"), upload.single("image"), updateDoctor);

export default router;

