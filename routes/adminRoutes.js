// routes/adminRoutes.js
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// لو مش عايز أي دوال حاليا، ممكن تسيب الرُوتر فاضي أو تحط دوال مؤقتة
router.get("/users", protect, authorize("staff"), (req, res) => {
  res.json({ message: "Route active but no action" });
});

router.get("/summary", protect, authorize("staff"), (req, res) => {
  res.json({ message: "Route active but no action" });
});

export default router;
