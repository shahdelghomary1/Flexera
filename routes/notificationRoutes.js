import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getUserNotifications, 
  markNotificationRead, 
  deleteNotification, 
  updateNotificationSettings,
  updateFCMToken,
  sendLabResult,
  testFirebaseNotification
} from "../controllers/notificationController.js";

const router = express.Router();

router.post("/broadcast", protect(["staff"]), async (req, res) => {
  try {
    const { message } = req.body;
    const notificationService = req.app.get("notificationService");

    await notificationService.notifyAllUsers("notification:broadcast", {
      message: message || "new broadcast message",
    });

    res.json({ success: true, message: "Broadcast sent to all users" });
  } catch (err) {
    console.error("Broadcast error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/test-trigger", async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");
    await notificationService.testTrigger();
    res.json({ success: true, message: "Test notification sent successfully" });
  } catch (err) {
    console.error("Test trigger error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get("/", protect(["user"]), getUserNotifications);


router.put("/:id/read", protect(["user"]), markNotificationRead);
router.put("/settings", protect(["user"]), updateNotificationSettings);

// حفظ/تحديث FCM token لإرسال إشعارات Firebase خارجية
router.post("/fcm-token", protect(["user"]), updateFCMToken);

// إرسال نتائج المختبر مع إشعار Pusher داخلي (يمكن استخدامه من السيرفر/المختبر)
router.post("/lab-result", protect(["staff"]), sendLabResult);

// اختبار إرسال إشعار Firebase خارجي (للتجربة)
router.post("/test-firebase", protect(["staff"]), testFirebaseNotification);

router.delete("/:id", protect(["user"]), deleteNotification);

export default router;

