import express from "express";
import { registerUser, loginUser, googleOAuth ,forgotPassword, verifyOTP, resetPassword ,updateAccount,getDoctorsForUser ,getDoctorScheduleForUser ,getUserExercises , getAccount ,logoutUser
  , googleOAuthFlutter
}
  from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, googleSchema , forgotSchema, verifyOtpSchema, resetPasswordSchema } from "../validators/authValidator.js";
import { protect } from "../middleware/authMiddleware.js"; 
import { upload } from "../middleware/multer.js"
import {  getUserAppointments ,  bookTimeSlot} from "../controllers/scheduleController.js";
import { bookAndPayTimeSlot, paymobWebhook } from "../controllers/scheduleController.js";
const router = express.Router();
// user auth and account management routes
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/google", validate(googleSchema), googleOAuth);
router.post("/forgot-password", validate(forgotSchema), forgotPassword);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOTP);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.put("/authaccount", protect(), upload.fields([{ name: "image", maxCount: 1 },{ name: "medicalFile", maxCount: 1 }]),updateAccount);
router.get("/authaccount", protect(),protect(["user"]),getAccount);
router.get("/authdoctors", protect(), getDoctorsForUser);
router.get("/doctor-schedule", protect(), getDoctorScheduleForUser);
router.get("/my-exercises", protect(["user"]), getUserExercises);
router.post("/logout", protect(["user"]), logoutUser);



// appointment routes for users not working aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
router.post("/book-pay", protect(["user"])  , bookAndPayTimeSlot);
router.post("/paymob-webhook", paymobWebhook);

// 💡 FIX: أضف مسار GET لمنع ظهور "Cannot GET" عند إعادة توجيه المتصفح
router.get("/paymob-webhook", (req, res) => {
    // يمكن إرسال رسالة بسيطة للمستخدم تفيد بانتهاء الدفع
    res.status(200).send("Payment process finished. Waiting for final confirmation.");
});
router.post("/book-appointment", protect(["user"]), bookTimeSlot);
router.get("/my-appointments", protect(["user"]), getUserAppointments);
router.post("/google/flutter", googleOAuthFlutter);
export default router;

