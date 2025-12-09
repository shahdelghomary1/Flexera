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
router.get("/test", async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");

    if (!notificationService) {
      return res.status(500).json({
        success: false,
        message: "NotificationService not found in app context"
      });
    }

    // ⚠️ طباعة قيم Pusher للتحقق
    console.log("PUSHER_APP_ID:", process.env.PUSHER_APP_ID);
    console.log("PUSHER_KEY:", process.env.PUSHER_KEY);
    console.log("PUSHER_SECRET:", process.env.PUSHER_SECRET ? "DEFINED" : "UNDEFINED");
    console.log("PUSHER_CLUSTER:", process.env.PUSHER_CLUSTER);

  const testUserId = "6936cecbcd6b15450dd4a3f4";

    await notificationService.notifyUser(
      testUserId,
      "notification:test",
      { message: "🚀 Test notification from Vercel backend with Env Check!" },
      false // ما تحفظوش في DB
    );

    res.json({
      success: true,
      message: "Test notification sent! Check console for env values."
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