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



export const getUserFCMInfo = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId, "fcmToken notificationsEnabled name email");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      userInfo: {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        hasFCMToken: !!user.fcmToken,
        fcmToken: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : null,
        fcmTokenLength: user.fcmToken ? user.fcmToken.length : 0,
        notificationsEnabled: user.notificationsEnabled,
      },
      instructions: {
        ifNoToken: "To get FCM token: 1) From mobile app (Flutter/React Native), 2) From Firebase Console test message, 3) Use a test token from Firebase documentation",
        saveToken: "POST /api/notifications/fcm-token with Authorization header and body: { 'fcmToken': 'YOUR_TOKEN' }"
      }
    });
  } catch (err) {
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

    // التحقق من حالة المستخدم قبل الإرسال
    const user = await User.findById(userId, "fcmToken notificationsEnabled name email");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userInfo = {
      userId: user._id.toString(),
      userName: user.name,
      hasFCMToken: !!user.fcmToken,
      fcmTokenLength: user.fcmToken ? user.fcmToken.length : 0,
      notificationsEnabled: user.notificationsEnabled,
    };

    if (!user.fcmToken) {
      return res.status(400).json({
        success: false,
        message: "User does not have FCM token. Please save FCM token first using /api/notifications/fcm-token",
        userInfo,
      });
    }

    if (user.notificationsEnabled === false) {
      return res.status(400).json({
        success: false,
        message: "User has notifications disabled",
        userInfo,
      });
    }

    console.log(`📤 Attempting to send Firebase notification to user ${userId} (${user.name})`);
    console.log(`   FCM Token: ${user.fcmToken.substring(0, 20)}...`);
    console.log(`   Title: ${title || "Test Notification"}`);
    console.log(`   Body: ${body || "This is a test notification from the server"}`);

    // هنا خليت كل القيم Strings
    const result = await notificationService.sendFirebaseNotification(
      userId,
      title || "Test Notification",
      body || "This is a test notification from the server",
      { test: "true", timestamp: new Date().toISOString() }
    );

    console.log(`✅ Firebase notification sent successfully!`);
    console.log(`   Message ID: ${result}`);

    res.status(200).json({
      success: true,
      message: "Firebase notification sent successfully",
      userInfo,
      firebaseResponse: {
        messageId: result,
        sentAt: new Date().toISOString(),
      },
      notification: {
        title: title || "Test Notification",
        body: body || "This is a test notification from the server",
      },
      note: "Check the device to see if notification was received. Also check server logs for more details."
    });
  } catch (err) {
    console.error("❌ Test Firebase notification error:", err);
    console.error("   Error code:", err.code);
    console.error("   Error message:", err.message);
    
    res.status(500).json({ 
      success: false, 
      message: err.message,
      error: {
        code: err.code || "Unknown error",
        message: err.message,
        details: err.errorInfo || null,
      },
      troubleshooting: {
        "messaging/invalid-registration-token": "FCM token is invalid. User needs to get a new token from the app.",
        "messaging/registration-token-not-registered": "FCM token is not registered. User needs to register again.",
        "messaging/authentication-error": "Firebase credentials are invalid. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env",
        "messaging/invalid-argument": "Invalid arguments in the notification payload.",
      }
    });
  }
};
