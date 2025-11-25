import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import { updateDoctorAccount, getAllDoctors, addDoctor, updateDoctor, deleteDoctor, doctorSignup, doctorForgotPassword, doctorVerifyOTP,
  doctorResetPassword,doctorLogin} from "../controllers/doctorController.js";
import { doctorSchema } from "../validators/doctorValidation.js";
import { validate } from "../middleware/validate.js";
const router = express.Router();


router.get("/", protect, authorize("staff"), getAllDoctors);

router.post("/", protect(["staff"]),validate(doctorSchema), authorize("staff"), upload.single("image"), addDoctor);
router.put("/:id", protect, authorize("staff"), upload.single("image"), updateDoctor);
router.delete("/:id", protect, authorize("staff"), deleteDoctor);

router.post("/signup", doctorSignup);
router.post("/login", doctorLogin);

router.post("/forgot-password", doctorForgotPassword);
router.post("/verify-otp", doctorVerifyOTP);
router.post("/reset-password", doctorResetPassword);
router.put( "/account", protect("doctor"), upload.single("image"),updateDoctorAccount
);






export default router;
