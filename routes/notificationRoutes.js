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
// =====================


     // ⚠️ حطي هنا userId من ال DB عندك
// =====================
// 🔥 Test Route with Env Check
// =====================
router.post("/test", async (req, res) => {
  try {
    const { type, userId, doctorId, message } = req.body;

    const notificationService = req.app.get("notificationService");
    if (!notificationService)
      return res.status(500).json({ message: "NotificationService not initialized" });

    if (type === "user" && userId) {
      await notificationService.notifyUser(userId, "notification:test", { message });
      return res.json({ success: true, message: "Test notification sent to user" });
    }

    if (type === "doctor" && doctorId) {
      await notificationService.notifyDoctor(doctorId, "notification:test", { message });
      return res.json({ success: true, message: "Test notification sent to doctor" });
    }

    if (type === "general") {
      await notificationService.pusher.trigger("general", "notification:test", { message });
      return res.json({ success: true, message: "Test notification sent to general channel" });
    }

    res.status(400).json({ success: false, message: "Invalid type or missing ID" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});





export default router;