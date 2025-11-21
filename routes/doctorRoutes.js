// routes/doctorRoutes.js
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

// جلب كل الدكاترة
router.get("/", protect, authorize("staff"), getAllDoctors);

// إضافة دكتور مع صورة
// لازم الصورة key تبقى "image" عشان multer يشتغل
router.post("/", protect, authorize("staff"), upload.single("image"), addDoctor);

// تحديث بيانات دكتور + صورة
router.put("/:id", protect, authorize("staff"), upload.single("image"), updateDoctor);

// حذف دكتور
router.delete("/:id", protect, authorize("staff"), deleteDoctor);

export default router;
