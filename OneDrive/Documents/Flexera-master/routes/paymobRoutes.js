import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { initPayment, paymobCallback } from "../controllers/paymobController.js";
const router = express.Router();
router.post("/init", protect(["user"]), initPayment);
router.post("/callback", paymobCallback);

export default router;
