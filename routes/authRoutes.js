import express from "express";
import { registerUser, loginUser, googleOAuth ,forgotPassword, verifyOTP, resetPassword ,updateAccount,getDoctorsForUser ,getDoctorScheduleForUser ,getUserAppointments}  from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, googleSchema , forgotSchema, verifyOtpSchema, resetPasswordSchema } from "../validators/authValidator.js";
import { protect } from "../middleware/authMiddleware.js"; 
import { upload } from "../middleware/multer.js"
import { bookAppointment, getUserAppointments } from "../controllers/scheduleController.js";
const router = express.Router();
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/google", validate(googleSchema), googleOAuth);
router.post("/forgot-password", validate(forgotSchema), forgotPassword);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOTP);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.put("/authaccount", protect(), upload.fields([{ name: "image", maxCount: 1 },{ name: "medicalFile", maxCount: 1 }]),updateAccount);
router.get("/authdoctors", protect(), getDoctorsForUser);
router.post("/book-appointment", protect(["user"]), bookAppointment);
router.get("/my-appointments", protect(["user"]), getUserAppointments);
router.get("/doctor-schedule", protect(), getDoctorScheduleForUser);
router.get("/my-exercises", protect(["user"]), getUserExercises);
// router.post("/google/flutter", googleOAuthFlutter)
export default router;

