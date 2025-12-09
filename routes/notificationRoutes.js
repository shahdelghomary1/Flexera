import express from "express";

const router = express.Router();

router.get("/test-all", async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");

    // 1️⃣ طباعة إعدادات Pusher
    console.log("Pusher Config:", {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER
    });

    // 2️⃣ إرسال payload بسيط لكل المستخدمين
    await notificationService.notifyAllUsers("notification:test", {
      message: "Broadcast test"
    });

    // 3️⃣ تجربة إرسال مباشر على قناة عامة
    const response = await notificationService.pusher.trigger(
      "general",
      "notification:test",
      { message: "Hello from server" }
    );
    console.log("✅ Direct trigger response:", response);

    res.json({
      success: true,
      message: "تم تنفيذ الثلاث اختبارات (config + payload بسيط + trigger مباشر)"
    });
  } catch (err) {
    console.error("❌ Test-all error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
