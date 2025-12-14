// routes/adminRoutes.js
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { getAllUsers ,updateDoctor ,deleteDoctor ,logoutStaff ,getAllPaidAppointmentsForStaff} from "../controllers/adminController.js";
import { upload } from "../middleware/multer.js";
const router = express.Router();

router.put("/doctors/:id", upload.single("image"), updateDoctor);
router.delete("/doctors/:id", deleteDoctor);
router.get("/users", protect(), authorize("staff"), getAllUsers);
router.get("/appointments", protect(["staff"]), getAllPaidAppointmentsForStaff);
router.get("/summary", protect(), authorize("staff"), (req, res) => {
  res.json({ message: "Route active but no action" });
});
router.post("/logout/staff", logoutStaff);
export default router;
