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
  console.log("📢 doctorAdded triggered for:", doctor.name);

  // إشعار جماعي لكل المستخدمين
  await this.notifyAllUsers("notification:newDoctor", {
    message: `دكتور جديد انضم: ${doctor.name}`,
    doctorId: doctor._id
  });

  console.log("✅ doctorAdded broadcast sent to all users");
}

}

