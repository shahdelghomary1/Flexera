import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import {
  getAllDoctors,
  addDoctor,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctorController.js";

const router = express.Router();

router.get("/", protect, authorize("staff"), getAllDoctors);
router.post("/", protect, authorize("staff"), upload.single("image"), addDoctor);
router.put("/:id", protect, authorize("staff"), upload.single("image"), updateDoctor);
router.delete("/:id", protect, authorize("staff"), deleteDoctor);

export default router;
