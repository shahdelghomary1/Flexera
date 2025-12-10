import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({
      $or: [
        { user: userId },
        { user: null, type: "notification:newDoctor" }, 
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50); 

    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });
      
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

   
    const notification = await Notification.findOne({ 
      _id: id, 
      user: userId 
    });

    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: "Notification not found or you don't have permission to delete it" 
      });
    }

    await Notification.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: "Notification deleted successfully" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

export const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationsEnabled, deleteExisting } = req.body;

    if (typeof notificationsEnabled !== "boolean") {
      return res.status(400).json({ 
        success: false, 
        message: "notificationsEnabled must be a boolean value" 
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { notificationsEnabled },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (notificationsEnabled === false && deleteExisting === true) {
      const deleteResult = await Notification.deleteMany({ user: userId });
      console.log(`🗑 Deleted ${deleteResult.deletedCount} notifications for user ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: "Notifications disabled and existing notifications deleted successfully",
        deletedCount: deleteResult.deletedCount,
        user: {
          _id: user._id,
          notificationsEnabled: user.notificationsEnabled
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `Notifications ${notificationsEnabled ? "enabled" : "disabled"} successfully`,
      user: {
        _id: user._id,
        notificationsEnabled: user.notificationsEnabled
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const updateFCMToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "FCM token is required and must be a string",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FCM token updated successfully",
      user: {
        _id: user._id,
        fcmToken: user.fcmToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const sendLabResult = async (req, res) => {
  try {
    const { userId, labName, resultUrl, testType, date } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const notificationService = req.app.get("notificationService");
    
    await notificationService.notifyLabResult(userId, {
      labName,
      resultUrl,
      testType,
      date: date || new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Lab result notification sent successfully",
    });
  } catch (err) {
    console.error("Send lab result error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const testFirebaseNotification = async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const notificationService = req.app.get("notificationService");
    
    if (!notificationService) {
      return res.status(500).json({
        success: false,
        message: "Notification service not available",
      });
    }

    const result = await notificationService.sendFirebaseNotification(
      userId,
      title || "Test Notification",
      body || "This is a test notification from the server",
      { test: true, timestamp: new Date().toISOString() }
    );

    res.status(200).json({
      success: true,
      message: "Firebase notification sent successfully",
      result,
    });
  } catch (err) {
    console.error("Test Firebase notification error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message,
      error: err.code || "Unknown error"
    });
  }
};