import Notification from "../models/notificationModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import Pusher from "pusher";

export default class NotificationService {
  constructor() {
    console.log("Pusher Config:", {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER
    });

    this.pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }

 async notifyAllUsers(event, payload, saveToDB = true) {
  try {
    const users = await userModel.find({}, "_id email name notificationsEnabled");
    console.log(`👥 Found ${users.length} users to notify`);

    for (const user of users) {
      // التحقق من إعدادات الإشعارات للمستخدم
      if (user.notificationsEnabled === false) {
        console.log(`⏭ Skipping notification for user ${user._id} (notifications disabled)`);
        continue;
      }

      console.log(`➡ Preparing notification for user: ${user._id} (${user.email})`);

      let notification;
      if (saveToDB) {
        try {
          notification = await Notification.create({
            user: user._id,
            type: event,
            message: payload.message,
            data: payload,
          });
          payload.notificationId = notification._id;
          console.log(`✅ Saved notification to DB: ${notification._id}`);
        } catch (dbErr) {
          console.error(`❌ Failed to save notification for user ${user._id}:`, dbErr);
          continue; // نكمل الباقيين
        }
      }

      try {
        await this.pusher.trigger(`user-${user._id}`, event, payload);
        console.log(`📢 Sent event "${event}" to channel user-${user._id}`);
      } catch (pusherErr) {
        console.error(`❌ Failed to send event to user-${user._id}:`, pusherErr);
      }
    }

    console.log("✅ notifyAllUsers finished");

  } catch (err) {
    console.error("❌ notifyAllUsers general error:", err);
  }
}


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
    return this.pusher.trigger(`doctor-${doctorId}`, event, payload);
  }

  async notifyUser(userId, event, payload, saveToDB = true) {
    try {
      // التحقق من إعدادات الإشعارات للمستخدم
      const user = await userModel.findById(userId, "notificationsEnabled");
      if (!user) {
        console.error(`❌ User ${userId} not found`);
        return;
      }

      if (user.notificationsEnabled === false) {
        console.log(`⏭ Skipping notification for user ${userId} (notifications disabled)`);
        // لا يتم حفظ الإشعار في DB ولا إرساله عبر Pusher
        return;
      }

      let notification;
      if (saveToDB) {
        notification = await Notification.create({
          user: userId,
          type: event,
          message: payload.message,
          data: payload,
        });
        payload.notificationId = notification._id;
        console.log(`✅ Saved notification to DB for user ${userId}: ${notification._id}`);
      }
      await this.pusher.trigger(`user-${userId}`, event, payload);
      console.log(`📢 Sent event "${event}" to channel user-${userId}`);
    } catch (error) {
      console.error(`❌ Failed to notify user ${userId}:`, error);
      throw error;
    }
  }

 

  async notifyAllDoctors(event, payload, saveToDB = true) {
    const doctors = await doctorModel.find({}, "_id");
    for (const doctor of doctors) {
      let notification;
      if (saveToDB) {
        notification = await Notification.create({
          doctor: doctor._id,
          type: event,
          message: payload.message,
          data: payload,
        });
        payload.notificationId = notification._id;
      }
      await this.pusher.trigger(`doctor-${doctor._id}`, event, payload);
    }
  }

  async testTrigger() {
    try {
      const response = await this.pusher.trigger("general", "notification:test", {
        message: "Hello from server"
      });
      console.log("✅ Test trigger success:", response);
    } catch (error) {
      console.error("❌ Test trigger error:", error);
    }
  }
// notificationService.js
// notificationService.js

async doctorAdded(doctor) {
  console.log("📢 doctorAdded triggered for:", doctor.name); // 👈 (1) تأكد من ظهور هذا

  // 1. استدعاء الدالة المساعدة notifyAllUsers للحفظ والإرسال
  try {
    // هذه الدالة ستقوم بالتكرار على جميع المستخدمين:
    // - حفظ إشعار فردي لكل مستخدم في قاعدة البيانات.
    // - إرسال إشعار لحظي لكل مستخدم عبر Pusher/Socket.io على قناته الخاصة (user-ID).
    await this.notifyAllUsers("notification:newDoctor", {
      message: `دكتور جديد انضم: ${doctor.name}`,
      doctorId: doctor._id,
      doctorName: doctor.name,
    });

    // لا يمكن تسجيل ID إشعار واحد هنا لأنها أصبحت عملية جماعية
    console.log("✅ Bulk notification process initiated via notifyAllUsers."); // 👈 تأكيد بدء العملية بنجاح

  } catch (error) {
    // إذا ظهر هذا، فالمشكلة في دالة notifyAllUsers أو اتصال Pusher/قاعدة البيانات
    console.error("❌ ERROR during notifyAllUsers for doctorAdded:", error.message, error.stack); // 👈 (3) إذا ظهر هذا، فراجع الـ Schema أو دالة notifyAllUsers
  }



}

}