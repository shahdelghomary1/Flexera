// routes/adminRoutes.js
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { getAllUsers } from "../controllers/adminController.js";

const router = express.Router();


router.get("/users", protect(), authorize("staff"), getAllUsers);
router.get("/summary", protect(), authorize("staff"), (req, res) => {
  res.json({ message: "Route active but no action" });
});

export default router;
