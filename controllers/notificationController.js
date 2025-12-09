import Notification from "../models/notificationModel.js";

// جلب إشعارات المستخدم (للمريض أو الطبيب)
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // جلب الإشعارات الخاصة بالـ user ID والإشعارات العامة (user: null)
    const notifications = await Notification.find({
      $or: [
        { user: userId },
        { user: null, type: "notification:newDoctor" }, // إشعارات عامة (انضمام طبيب)
        // يمكن إضافة { doctor: userId } هنا إذا كان الطبيب يستخدم نفس الـ API
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50); // جلب آخر 50 إشعاراً فقط

    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// تعليم إشعار كمقروء
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

// حذف إشعار
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification)
      return res.status(404).json({ message: "Notification not found" });

    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};