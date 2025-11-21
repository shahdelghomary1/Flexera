import express from "express";
import { registerUser, loginUser, googleAuth ,forgotPassword, verifyOTP, resetPassword} from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, googleSchema , forgotSchema, verifyOtpSchema, resetPasswordSchema } from "../validators/authValidator.js";
const router = express.Router();
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/google", validate(googleSchema), googleAuth);
router.post("/forgot-password", validate(forgotSchema), forgotPassword);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOTP);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
export default router;

