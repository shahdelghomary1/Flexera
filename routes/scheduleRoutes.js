import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addSchedule, getDoctorSchedule, updateSchedule,getDoctorAppointments, cancelBookedTimeSlot } from "../controllers/scheduleController.js";

const router = express.Router();
 
router.post("/", protect("doctor"), addSchedule);
router.get("/", protect("doctor"), getDoctorSchedule);
router.put("/:id", protect("doctor"), updateSchedule);

// not working aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
router.get("/my-appointments", protect("doctor"), getDoctorAppointments);
router.delete("/cancel/:id", protect("doctor"), cancelBookedTimeSlot);

export default router;
