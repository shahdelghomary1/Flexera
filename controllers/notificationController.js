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