import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import { updateDoctorAccount, getAllDoctors, addDoctor, doctorSignup, doctorForgotPassword, doctorVerifyOTP,
  doctorResetPassword,doctorLogin,logoutDoctor , addExercisesToUser ,getDoctorAccount,updateUserExercise,deleteUserExercise} from "../controllers/doctorController.js";
import { addDoctorSchema, updateDoctorSchema, doctorSignupSchema, doctorResetPasswordSchema } from "../validators/doctorValidation.js";
import { getAppointmentsForDoctor, addExercisesToAppointment } from "../controllers/scheduleController.js";

import { validate } from "../middleware/validate.js";
const router = express.Router();
// appointments for doctor not working aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
router.get("/appointments", protect(["doctor"]), getAppointmentsForDoctor);
router.put("/appointments/:scheduleId/exercises", protect(["doctor"]), addExercisesToAppointment);
 

// deshboard for staff to manage doctors
router.get("/", protect(), authorize("staff"), getAllDoctors);


router.post("/", protect(["staff"]), authorize("staff"), upload.single("image"), validate(addDoctorSchema), addDoctor);
  

// for doctor auth and account management
router.post("/signup",validate(doctorSignupSchema ), doctorSignup);
router.post("/login", doctorLogin);
router.post("/forgot-password", doctorForgotPassword);
router.post("/verify-otp", doctorVerifyOTP);
router.post("/reset-password", validate(doctorResetPasswordSchema), doctorResetPassword);
router.put("/account", protect(["doctor"]), upload.single("image"), validate(updateDoctorSchema), updateDoctorAccount);
router.get("/account", protect(["doctor"]), getDoctorAccount);


//exercises to user
router.put("/users/:userId/exercises", protect(["doctor"]), addExercisesToUser);
router.put("/users/:userId/exercises/:exerciseId",protect(["doctor"]),updateUserExercise);
router.delete("/users/:userId/exercises/:exerciseId",protect(["doctor"]),deleteUserExercise);



router.post("/logout/doctor", logoutDoctor);


export default router;
