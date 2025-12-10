import Notification from "../models/notificationModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import Pusher from "pusher";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}


export const firebaseAdmin = admin;

export default class NotificationService {
  constructor() {
    console.log("Pusher Config:", {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
    });

    this.pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }

async notifyAllUsers(event, payload, saveToDB = true, sendFirebase = true) {
  try {
    const users = await userModel.find({}, "_id email name notificationsEnabled fcmToken");
    console.log(`Found ${users.length} users to notify`);

    for (const user of users) {
      if (user.notificationsEnabled === false) {
        console.log(`⏭ Skipping user ${user._id} (notifications disabled)`);
        continue;
      }

      let notification;
      if (saveToDB) {
        try {
          notification = await Notification.create({
            user: user._id,
            type: event,
            message: payload.message,
            data: payload,
          });
        } catch (dbErr) {
          console.error(`DB save failed for user ${user._id}:`, dbErr);
          continue;
        }
      }

      // Pusher
      try {
        await this.pusher.trigger(`user-${user._id}`, event, { ...payload, notificationId: notification?._id });
        console.log(`📡 Pusher sent → user-${user._id}`);
      } catch (pusherErr) {
        console.error(`Pusher error (user-${user._id}):`, pusherErr);
      }

      // Firebase
      if (sendFirebase && user.fcmToken) {
        try {
          const data = toStringData({
            ...payload,
            event,
            notificationId: notification?._id?.toString(),
          });
          await this.sendFirebaseNotification(
            user._id,
            payload.title || "Notification",
            payload.message,
            data
          );
          console.log(`✅ Firebase sent → user ${user._id}`);
        } catch (firebaseErr) {
          console.error(`Firebase error (user ${user._id}):`, firebaseErr);
        }
      }
    }
    console.log("notifyAllUsers finished");
  } catch (err) {
    console.error("notifyAllUsers error:", err);
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

  async sendFirebaseNotification(userId, title, body, data = {}) {
    try {
      const user = await userModel.findById(userId, "fcmToken notificationsEnabled name email");
      if (!user) {
        const error = new Error(`User ${userId} not found`);
        error.code = 'USER_NOT_FOUND';
        throw error;
      }

      if (!user.fcmToken) {
        const error = new Error(`No FCM token found for user ${userId}`);
        error.code = 'NO_FCM_TOKEN';
        throw error;
      }

      if (user.notificationsEnabled === false) {
        const error = new Error(`Notifications disabled for user ${userId}`);
        error.code = 'NOTIFICATIONS_DISABLED';
        throw error;
      }

      console.log(` Sending Firebase notification to user ${userId} (${user.name || user.email})`);
      console.log(`   Token: ${user.fcmToken.substring(0, 30)}...`);

      const message = {
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...data,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        token: user.fcmToken,
      };

      const response = await admin.messaging().send(message);
      console.log(` Firebase notification sent successfully!`);
      console.log(`   Message ID: ${response}`);
      console.log(`   User: ${user.name || user.email} (${userId})`);
      return response;
    } catch (error) {
      console.error(`Failed to send Firebase notification to user ${userId}:`);
      console.error(`   Error Code: ${error.code || 'UNKNOWN'}`);
      console.error(`   Error Message: ${error.message}`);
      if (error.errorInfo) {
        console.error(`   Error Details:`, error.errorInfo);
      }
    
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        await userModel.findByIdAndUpdate(userId, { fcmToken: null });
        console.log(` Removed invalid FCM token for user ${userId}`);
      }
      throw error;
    }
  }
 async notifyUser(userId, event, payload, saveToDB = true, sendFirebase = true) {
  try {
    const user = await userModel.findById(userId, "notificationsEnabled fcmToken");
    if (!user || user.notificationsEnabled === false) return;

    const notification = saveToDB
      ? await Notification.create({
          user: userId,
          type: event,
          message: payload.message,
          data: payload,
        })
      : null;

    // Pusher
    await this.pusher.trigger(`user-${userId}`, event, { ...payload, notificationId: notification?._id });

    // Firebase
    if (sendFirebase && user.fcmToken) {
      const data = toStringData({
        ...payload,
        event,
        notificationId: notification?._id?.toString(),
      });
      await this.sendFirebaseNotification(
        userId,
        payload.title || "Notification",
        payload.message,
        data
      );
    }
  } catch (error) {
    console.error(`notifyUser error (${userId}):`, error);
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
        message: "Hello from server",
      });
      console.log("Test trigger success:", response);
    } catch (error) {
      console.error("Test trigger error:", error);
    }
  }

async doctorAdded(doctor) {
  try {
    await this.notifyAllUsers("notification:newDoctor", {
      message: `new doctor add ${doctor.name}`,
      doctorId: doctor._id,
      doctorName: doctor.name,
      title: "New Doctor Added"
    }, true, true); 
  } catch (error) {
    console.error("ERROR during notifyAllUsers for doctorAdded:", error.message, error.stack);
  }
}

async appointmentReminder(userId, appointmentData) {
  try {
    const { doctorName, date, time, from, to } = appointmentData;
    const message = `Reminder: You have an appointment with ${doctorName} on ${date} from ${from} to ${to}`;
    await this.notifyUser(userId, "notification:appointmentReminder", {
      message,
      doctorName,
      date,
      time,
      from,
      to,
      title: "Appointment Reminder"
    }, true, true); 
  } catch (error) {
    console.error(`Failed to send appointment reminder to user ${userId}:`, error);
  }
}

async newScheduleAvailable(doctor, date, timeSlots) {
  try {
    const slotsCount = timeSlots.length;
    const message = `new schedule available with ${doctor.name} on ${date} (${slotsCount} slots available)`;
    await this.notifyAllUsers("notification:newScheduleAvailable", {
      message,
      doctorId: doctor._id,
      doctorName: doctor.name,
      date,
      slotsCount,
      timeSlots,
      title: "New Schedule Available"
    }, true, true);
  } catch (error) {
    console.error(`Failed to send new schedule notification:`, error);
  }
}


 
  async notifyLabResult(userId, labResultData) {
    try {
      const { labName, resultUrl, testType, date } = labResultData;
      const message = `result ${labName || 'lab'}`;
      
      const payload = {
        message,
        title: "Laboratory results",
        labName: labName || "lab",
        resultUrl,
        testType,
        date,
        type: "lab_result",
      };

    
      await this.notifyUser(userId, "notification:labResult", payload, true, false);
      
     
      await this.sendFirebaseNotification(
        userId,
        "Laboratory results",
        message,
        { ...payload, event: "notification:labResult" }
      );

      console.log(` Lab result notification sent to user ${userId}`);
    } catch (error) {
      console.error(`Failed to send lab result notification to user ${userId}:`, error);
      throw error;
    }
  }
}
