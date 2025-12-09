import Notification from "../models/notificationModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";

import Pusher from "pusher"; // ✨ استيراد مكتبة Pusher

export default class NotificationService {
  constructor() {
    // 💡 إعداد Pusher باستخدام متغيرات البيئة التي أدخلتها
    this.pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID, // "2088917"
      key: process.env.PUSHER_KEY,     // "6bb56cdacffa37ed5541"
      secret: process.env.PUSHER_SECRET, // "f876abf7718c6df66a48"
      cluster: process.env.PUSHER_CLUSTER, // "mt1"
      useTLS: true,
    });
  }

  // الدالة الأساسية لحفظ وإرسال إشعار لمستخدم (مريض)
  async notifyUser(userId, event, payload, saveToDB = true) {
    let notification;
    if (saveToDB) {
      notification = await Notification.create({
        user: userId,
        type: event,
        message: payload.message,
        data: payload,
      });
      // نُضيف الـ ID الخاص بالإشعار المرسل ليتمكن Flutter من تعليمه كمقروء
      payload.notificationId = notification._id; 
    }
    
    // ✨ إرسال لحظي عبر قناة خاصة بالمستخدم (يجب على Flutter الاشتراك في channel: 'user-ID')
    this.pusher.trigger(`user-${userId}`, event, payload);
  }

  // الدالة الأساسية لحفظ وإرسال إشعار لطبيب
  async notifyDoctor(doctorId, event, payload, saveToDB = true) {
     let notification;
    if (saveToDB) {
      notification = await Notification.create({
        doctor: doctorId,
        type: event,
        message: payload.message,
        data: payload,
      });
       payload.notificationId = notification._id;
    }
    
    // ✨ إرسال لحظي عبر قناة خاصة بالطبيب (يجب على Flutter الاشتراك في channel: 'doctor-ID')
    this.pusher.trigger(`doctor-${doctorId}`, event, payload);
  }


  // 1. إشعار عند إضافة دكتور جديد (لكل المستخدمين) - يتم البحث عنه في notificationController
  async doctorAdded(doctor) {
    // 1. إنشاء إشعار عام في قاعدة البيانات (user: null)
    const generalNotification = await Notification.create({
      user: null, 
      type: "notification:newDoctor",
      message: `دكتور جديد انضم: ${doctor.name}`,
      data: { doctorId: doctor._id, doctorName: doctor.name },
    });

    // 2. ✨ إرسال لحظي عبر القناة العامة (general)
    // يجب على Flutter الاشتراك في channel: 'general'
    this.pusher.trigger('general', 'notification:newDoctor', {
      message: `دكتور جديد انضم: ${doctor.name}`,
      doctorId: doctor._id,
      notificationId: generalNotification._id
    });
  }


  // 2. إشعار عند إضافة تمارين للمريض (يُستدعى من doctorController.js)
  async exercisesAdded(userId, doctorId, exercises) {
    await this.notifyUser(userId, "notification:newExercises", {
      message: `تم إضافة تمارين جديدة من دكتورك`,
      doctorId,
      exercises,
    });
  }

  // 3. إشعار عند حجز موعد (بعد تأكيد الدفع) (يُستدعى من paymobController.js)
  async appointmentBooked(userId, doctorId, slot) {
    // إشعار للمريض
    await this.notifyUser(userId, "notification:appointmentBooked", {
      message: `تم حجز موعدك مع الدكتور ${slot.doctorName} بتاريخ ${slot.date}`,
      doctorId,
      slot,
    });

    // إشعار للطبيب
    await this.notifyDoctor(doctorId, "notification:newAppointment", {
      message: `تم حجز موعد جديد بتاريخ ${slot.date} في ${slot.from} - ${slot.to}`,
      userId,
      slot,
    });
  }
}