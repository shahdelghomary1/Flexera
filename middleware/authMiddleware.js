import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Doctor from "../models/doctorModel.js";
import mongoose from "mongoose";

export const protect = (roles = ["user", "staff", "doctor"]) => {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || req.headers.Authorization;
      if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

    
if (!decoded.id) {
  return res.status(400).json({ message: "Invalid user ID in token" });
}


      let currentUser;

   
      if (decoded.role === "doctor") {
        currentUser = await Doctor.findById(decoded.id).select("-password");
        if (!currentUser) return res.status(401).json({ message: "Doctor not found" });
      } else {
        currentUser = await User.findById(decoded.id).select("-password -resetOTP -resetOTPExpires");
        if (!currentUser) return res.status(401).json({ message: "User not found" });
      }

      console.log("Current user found:", currentUser);

      req.user = currentUser;
      req.user.role = decoded.role; 

      if (!roles.includes(decoded.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};


export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
