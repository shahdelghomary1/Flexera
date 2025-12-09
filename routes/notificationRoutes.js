import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// مسار لتجربة إرسال إشعار جماعي لكل المستخدمين
router.post("/broadcast", protect(["staff"]), async (req, res) => {
  try {
    const { message } = req.body;

    const notificationService = req.app.get("notificationService");
    if (!notificationService) {
      return res.status(500).json({ message: "NotificationService not initialized" });
    }

    await notificationService.notifyAllUsers("notification:broadcast", {
      message: message || "إشعار جماعي تجريبي",
    });

    res.json({ success: true, message: "تم إرسال الإشعار الجماعي لكل المستخدمين" });
  } catch (err) {
    console.error("Broadcast error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
