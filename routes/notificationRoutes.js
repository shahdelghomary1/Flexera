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
// 🔥 Test Route for Pusher
// =====================
router.get("/test", async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");

    if (!notificationService) {
      return res.status(500).json({
        success: false,
        message: "NotificationService not found in app context"
      });
    }

    const testUserId = "6936cecbcd6b15450dd4a3f4"; // ⚠️ حطي هنا userId من ال DB عندك

    await notificationService.notifyUser(
      testUserId,
      "notification:test",
      {
        message: "🚀 Test notification from Vercel backend!"
      },
      false // ما تحفظوش في DB.. فقط تجربة Pusher
    );

    res.json({
      success: true,
      message: "Test notification sent via Pusher!"
    });

  } catch (error) {
    console.error("TEST ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



export default router;