import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { updateNotificationSettings, deleteNotification } from "../controllers/notificationController.js";

const router = express.Router();

router.post("/broadcast", protect(["staff"]), async (req, res) => {
  try {
    const { message } = req.body;
    const notificationService = req.app.get("notificationService");

    await notificationService.notifyAllUsers("notification:broadcast", {
      message: message || "إشعار جماعي تجريبي",
    });

    res.json({ success: true, message: "تم إرسال الإشعار الجماعي لكل المستخدمين" });
  } catch (err) {
    console.error("Broadcast error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/test-trigger", async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");
    await notificationService.testTrigger();
    res.json({ success: true, message: "تم إرسال إشعار تجريبي مباشر" });
  } catch (err) {
    console.error("Test trigger error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.put("/settings", protect(["user"]), updateNotificationSettings);


router.delete("/:id", protect(["user"]), deleteNotification);

export default router;

