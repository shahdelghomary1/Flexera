import express from "express";
const router = express.Router();
router.get("/test-trigger", async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");
    const response = await notificationService.pusher.trigger(
      "general",
      "notification:test",
      { message: "Hello from server" }
    );
    res.json({ success: true, response });
  } catch (err) {
    console.error("❌ Trigger error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
