import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markNotificationRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

// 1. جلب كل الإشعارات الخاصة بالمستخدم الحالي
// المسار: GET /api/notifications
// مخصص لكل الأدوار (user, doctor, staff) لقراءة إشعاراتهم
router.get("/", protect(["user"]), getUserNotifications);

// 2. تعليم إشعار معين كمقروء
// المسار: PATCH /api/notifications/:id/read
router.patch("/:id/read", protect(["user"]), markNotificationRead);

// 3. حذف إشعار معين
// المسار: DELETE /api/notifications/:id
router.delete("/:id", protect(["user"]), deleteNotification);

export default router;