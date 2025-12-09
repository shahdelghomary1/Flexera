import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  // المستخدم (المريض) الذي سيستقبل الإشعار
  // يُستخدم ObjectId للربط بموديل User، ويمكن أن يكون null للإشعارات العامة
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  
  // الطبيب الذي سيستقبل الإشعار (إذا كان الإشعار خاصًا به)
  // نستخدم String لأنك تستخدم الـ ID كـ String في Doctor Model
  doctor: {
    type: String, 
    ref: "Doctor",
    default: null,
  },
  
  // نوع الإشعار: مثل "notification:newDoctor", "notification:newExercises", "notification:newAppointment"
  type: {
    type: String,
    required: true,
  },
  
  // رسالة الإشعار النصية التي ستظهر للمستخدم
  message: {
    type: String,
    required: true,
  },
  
  // بيانات إضافية (Payload) مثل تفاصيل الموعد أو التمارين
  data: {
    type: Object, 
    default: {},
  },
  
  // حالة الإشعار: هل تم قراءته أم لا
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true }); // لتضمين createdAt و updatedAt

export default mongoose.model("Notification", notificationSchema);