import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import { updateDoctorAccount, getAllDoctors, addDoctor, doctorSignup, doctorForgotPassword, doctorVerifyOTP,
  doctorResetPassword,doctorLogin,logoutDoctor , getDoctorAccount,addExercisesToUser,updateUserExercise,deleteUserExercise , getUserMedicalFileWithExercises,
 deleteTimeSlot, updateDoctor} from "../controllers/doctorController.js";
import { addDoctorSchema, updateDoctorSchema, doctorSignupSchema, doctorResetPasswordSchema } from "../validators/doctorValidation.js";
import { getAppointmentsForDoctor} from "../controllers/scheduleController.js";
import {
  getAllPaidPatients,
   getUpcomingPaidPatients,
   getPastPaidPatients  ,
} from "../controllers/doctorController.js";
import { validate } from "../middleware/validate.js";
const router = express.Router();
// appointments for doctor not working aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
router.get("/appointments", protect(["doctor"]), getAppointmentsForDoctor);
// deshboard for staff to manage doctors
router.get("/", protect(), authorize("staff"), getAllDoctors);
router.post("/", protect(["staff"]), authorize("staff"), upload.single("image"), validate(addDoctorSchema), addDoctor);
router.put("/:id", protect(["staff"]), authorize("staff"), upload.single("image"), updateDoctor);
// for doctor auth and account management
router.post("/signup",validate(doctorSignupSchema ), doctorSignup);
router.post("/login", doctorLogin);
router.post("/forgot-password", doctorForgotPassword);
router.post("/verify-otp", doctorVerifyOTP);
router.post("/reset-password", validate(doctorResetPasswordSchema), doctorResetPassword);
router.put(
  "/account",
  protect(["doctor"]),
  upload.single("image"),
  validate(updateDoctorSchema),
  updateDoctorAccount
);

router.get("/account", protect(["doctor"]), getDoctorAccount);
router.delete( "/schedule/:scheduleId/slot/:slotId", protect(["doctor"]), deleteTimeSlot);
// paid patients and their appointments
router.get("/all-paid-patients", protect(["doctor"]), getAllPaidPatients);
router.get("/past-paid-appointments", protect(["doctor"]), getPastPaidPatients  );
router.get("/upcoming-paid-appointments", protect(["doctor"]),  getUpcomingPaidPatients);
//exercises to user
router.post("/users/:userId/exercises", protect(["doctor"]), addExercisesToUser);
router.put("/users/:userId/exercises/:exerciseId",protect(["doctor"]),updateUserExercise);
router.delete("/users/:userId/exercises/:exerciseId",protect(["doctor"]),deleteUserExercise);
router.get("/user/:userId/full", protect(["doctor"]), getUserMedicalFileWithExercises);


router.post("/logout/doctor", logoutDoctor);


export default router;
