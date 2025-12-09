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
    return this.pusher.trigger(`user-${userId}`, event, payload);
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
      console.log(`📢 Sending event "${event}" to channel user-${user._id}`);
      await this.pusher.trigger(`user-${user._id}`, event, payload);
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
  async doctorAdded(doctor) {
  // 1️⃣ نخزن إشعار عام في الـ DB
  const generalNotification = await Notification.create({
    user: null,
    type: "notification:newDoctor",
    message: `دكتور جديد انضم: ${doctor.name}`,
    data: { doctorId: doctor._id, doctorName: doctor.name },
  });

  // 2️⃣ نرسل إشعار عام على قناة general
  try {
    const response = await this.pusher.trigger("general", "notification:newDoctor", {
      message: `دكتور جديد انضم: ${doctor.name}`,
      doctorId: doctor._id,
      notificationId: generalNotification._id,
    });
    console.log("✅ General Pusher Trigger Success: ", response);
  } catch (error) {
    console.error("❌ General PUSHER ERROR:", error.message || error);
  }

  // 3️⃣ نرسل إشعار لكل المستخدمين individually
  const users = await userModel.find({}, "_id");
  for (const user of users) {
    try {
      const notification = await Notification.create({
        user: user._id,
        type: "notification:newDoctor",
        message: `دكتور جديد انضم: ${doctor.name}`,
        data: { doctorId: doctor._id, doctorName: doctor.name },
      });

      await this.pusher.trigger(`user-${user._id}`, "notification:newDoctor", {
        message: `دكتور جديد انضم: ${doctor.name}`,
        doctorId: doctor._id,
        notificationId: notification._id,
      });

      console.log(`📢 Sent newDoctor event to user-${user._id}`);
    } catch (error) {
      console.error(`❌ Error sending to user-${user._id}:`, error.message || error);
    }
  }
}

}

