import Notification from "../models/notificationModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";

import Pusher from "pusher"; // ✨ استيراد مكتبة Pusher

export default class NotificationService {
  constructor() {
    // ✨ اطبعي القيم هنا قبل إنشاء الـ Pusher
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

  // باقي الدوال زي ما هي...
}


  // إشعار لمستخدم واحد
  async notifyUser(userId, event, payload, saveToDB = true) {
    let notification;
    if (saveToDB) {
      notification = await Notification.create({
        user: userId,
        type: event,
        message: payload.message,
        data: payload,
      });
      payload.notificationId = notification._id;
    }
    this.pusher.trigger(`user-${userId}`, event, payload);
  }

  // إشعار لطبيب واحد
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
    this.pusher.trigger(`doctor-${doctorId}`, event, payload);
  }

  // إشعار جماعي لكل المستخدمين
  // إشعار جماعي لكل المستخدمين
async notifyAllUsers(event, payload, saveToDB = true) {
  const users = await userModel.find({}, "_id");

  for (const user of users) {
    let notification;
    if (saveToDB) {
      notification = await Notification.create({
        user: user._id,
        type: event,
        message: payload.message,
        data: payload,
      });
      payload.notificationId = notification._id;
    }

    // ✨ هنا هنطبع في الـ console علشان نتأكد
    console.log(`📢 Sending event "${event}" to channel user-${user._id}`);

    this.pusher.trigger(`user-${user._id}`, event, payload)
      .then(response => {
        console.log(`✅ Pusher Trigger Success for user-${user._id}:`, response);
      })
      .catch(error => {
        console.error(`❌ Pusher Trigger Error for user-${user._id}:`, error);
      });
  }
}


  // إشعار جماعي لكل الدكاترة
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
      this.pusher.trigger(`doctor-${doctor._id}`, event, payload);
    }
  }

  async doctorAdded(doctor) {
    const generalNotification = await Notification.create({
      user: null,
      type: "notification:newDoctor",
      message: `دكتور جديد انضم: ${doctor.name}`,
      data: { doctorId: doctor._id, doctorName: doctor.name },
    });

    try {
      const response = await this.pusher.trigger("general", "notification:newDoctor", {
        message: `دكتور جديد انضم: ${doctor.name}`,
        doctorId: doctor._id,
        notificationId: generalNotification._id,
      });
      console.log("✅ Pusher Trigger Success: ", response);
    } catch (error) {
      console.error("❌ PUSHER AUTHENTICATION ERROR:", error.message || error);
    }
  }

  async exercisesAdded(userId, doctorId, exercises) {
    await this.notifyUser(userId, "notification:newExercises", {
      message: `تم إضافة تمارين جديدة من دكتورك`,
      doctorId,
      exercises,
    });
  }

  async appointmentBooked(userId, doctorId, slot) {
    await this.notifyUser(userId, "notification:appointmentBooked", {
      message: `تم حجز موعدك مع الدكتور ${slot.doctorName} بتاريخ ${slot.date}`,
      doctorId,
      slot,
    });

    await this.notifyDoctor(doctorId, "notification:newAppointment", {
      message: `تم حجز موعد جديد بتاريخ ${slot.date} في ${slot.from} - ${slot.to}`,
      userId,
      slot,
    });
  }
}
