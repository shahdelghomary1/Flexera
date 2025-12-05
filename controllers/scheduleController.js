import Schedule from "../models/scheduleModel.js";
import Doctor from "../models/doctorModel.js";
import User from "../models/userModel.js";
import axios from "axios";
import crypto from "crypto";
/// Add a new schedule for a doctor and validate time slots and update the schedule
export const addSchedule = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const requestDate = req.body.date; 

    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date();
 
    today.setHours(0, 0, 0, 0); 
    
   
    const scheduledDate = new Date(requestDate);
   
    scheduledDate.setHours(0, 0, 0, 0); 

 
    if (scheduledDate.getTime() < today.getTime()) {
      return res.status(400).json({
        message: "Cannot add a schedule for a past date. Please select today or a future date."
      });
    }
    // ------------------------------------------------------------------

    const timeToMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    
    for (const slot of req.body.timeSlots) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
   
      if (!timeRegex.test(slot.from) || !timeRegex.test(slot.to)) {
        return res.status(400).json({ 
          message: `Invalid time format in slot ${JSON.stringify(slot)}` 
        });
      }

      const fromMinutes = timeToMinutes(slot.from);
      const toMinutes = timeToMinutes(slot.to);

      if (toMinutes <= fromMinutes) {
        return res.status(400).json({ 
          message: `Invalid slot: 'to' must be after 'from' in slot ${JSON.stringify(slot)}` 
        });
      }
    }

   
    const slotsWithBooking = req.body.timeSlots.map(slot => ({
      ...slot,
      isBooked: false
    }));

    const seenSlots = new Set();
    for (const slot of slotsWithBooking) {
      const key = `${slot.from}-${slot.to}`;
      if (seenSlots.has(key)) {
        return res.status(400).json({ message: `Duplicate time slot detected in request: ${key}` });
      }
      seenSlots.add(key);
    }

    const existingSchedule = await Schedule.findOne({ doctor: doctorId, date: requestDate });

    if (existingSchedule) {
      for (const newSlot of slotsWithBooking) {
        for (const existingSlot of existingSchedule.timeSlots) {
          if (newSlot.from === existingSlot.from && newSlot.to === existingSlot.to) {
            return res.status(400).json({ 
              message: `This time slot already exists for the day: ${newSlot.from}-${newSlot.to}` 
            });
          }
        }
      }

      existingSchedule.timeSlots.push(...slotsWithBooking);
      await existingSchedule.save();

      return res.json({
        message: "Schedule updated successfully",
        schedule: existingSchedule
      });
    }

    const schedule = await Schedule.create({
      doctor: doctorId,
      date: requestDate,
      timeSlots: slotsWithBooking
    });

    res.json({
      message: "Schedule added successfully",
      schedule
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getDoctorSchedule = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.user._id; 
    const schedules = await Schedule.find({ doctor: doctorId });

    res.json({
      message: "Doctor schedule fetched",
      schedules
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const updateSchedule = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

   
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (schedule.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "You cannot edit another doctor's schedule" });
    }

    
    const timeToMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    
    for (const slot of req.body.timeSlots) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(slot.from) || !timeRegex.test(slot.to)) {
        return res.status(400).json({ 
          message: `Invalid time format in slot ${JSON.stringify(slot)}` 
        });
      }

      const fromMinutes = timeToMinutes(slot.from);
      const toMinutes = timeToMinutes(slot.to);

      if (toMinutes <= fromMinutes) {
        return res.status(400).json({ 
          message: `Invalid slot: 'to' must be after 'from' in slot ${JSON.stringify(slot)}` 
        });
      }
    }

  
    const updated = await Schedule.findByIdAndUpdate(
      scheduleId,
      {
        date: req.body.date,
        timeSlots: req.body.timeSlots
      },
      { new: true }
    );

    res.json({
      message: "Schedule updated successfully",
      schedule: updated
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


export const getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;

    const schedules = await Schedule.find({ user: userId })
      .populate("doctor", "name  image");

    res.status(200).json({
      message: "User appointments fetched",
      schedules,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const getDoctorAppointments = async (req, res) => {
  try {
    // جلب جدول المواعيد للطبيب الحالي
    const doctorId = req.user._id;
    
    // 🎯 التعديل المطلوب: استخدام populate لجلب معلومات اليوزر المحجوزة
    const schedules = await Schedule.find({ doctor: doctorId })
      .populate({
        path: 'timeSlots.bookedBy', // الوصول إلى الحقل bookedBy داخل كل timeSlot
        select: 'name image email'  // جلب اسم اليوزر، صورته، وإيميله
      })
      .sort({ date: 1 });

    res.json({
      message: "Doctor appointments fetched",
      schedules
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const cancelBookedTimeSlot = async (req, res) => {
    try {
        const { scheduleId, from, to } = req.body;
        const userId = req.user.id; 

        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        const slotIndex = schedule.timeSlots.findIndex(
            slot => slot.from === from && slot.to === to && slot.bookedBy.toString() === userId.toString()
        );

        if (slotIndex === -1) {
            return res.status(404).json({ message: "Booked time slot not found for this user" });
        }

        schedule.timeSlots[slotIndex].isBooked = false;
        schedule.timeSlots[slotIndex].bookedBy = null; // إزالة مرجع اليوزر

        await schedule.save();

        res.json({ message: "Time slot cancelled successfully", schedule });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
export const getAppointmentsForDoctor = async (req, res) => {
    try {
      
        const doctorId = req.user.id; 

     
        const schedules = await Schedule.find({ 
            doctor: doctorId 
        })
        .select('date timeSlots') 
        .populate({
            path: 'timeSlots.bookedBy',
            select: 'name image medicalFile' 
        })
        .sort({ date: 1 });

        if (!schedules.length) {
            return res.status(404).json({ message: "No schedules found" });
        }

        const bookedAppointments = [];

        schedules.forEach(schedule => {
            schedule.timeSlots.forEach(slot => {
               
                if (slot.isBooked && slot.bookedBy) {
                    bookedAppointments.push({
                        date: schedule.date,
                        from: slot.from,
                        to: slot.to,
                        user: slot.bookedBy, 
                        slotId: slot._id
                    });
                }
            });
        });

        res.status(200).json({
            message: "Booked appointments fetched successfully",
            appointments: bookedAppointments
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


export const bookTimeSlot = async (req, res) => {
  try {
    const { doctorId, date, from } = req.body;
    const userId = req.user._id;

    if (!doctorId || !date || !from) {
      return res.status(400).json({ message: "Doctor ID, date, and start time ('from') are required" });
    }

    const schedule = await Schedule.findOne({ doctor: doctorId, date });

    if (!schedule) {
      return res.status(404).json({ message: "No schedule found for this date" });
    }

    const slotIndex = schedule.timeSlots.findIndex(slot => slot.from === from);

    if (slotIndex === -1) {
      return res.status(404).json({ message: "Time slot not found for this start time" });
    }

    if (schedule.timeSlots[slotIndex].isBooked) {
      return res.status(400).json({ message: "Time slot already booked" });
    }

    schedule.timeSlots[slotIndex].isBooked = true;
    schedule.timeSlots[slotIndex].bookedBy = userId;
    await schedule.save();

    res.json({
      message: "Time slot booked successfully",
      bookedSlot: schedule.timeSlots[slotIndex]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
//////////////////////////////////////////////////////////////
export const bookAndPayTimeSlot = async (req, res) => {
  try {
    const { doctorId, date, slotId } = req.body;
    const userId = req.user._id;

    // 1. التحقق من وجود الطبيب والجدول وتوفر الموعد
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const schedule = await Schedule.findOne({ doctor: doctorId, date });
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const slot = schedule.timeSlots.find(s => s._id.toString() === slotId);
    if (!slot) return res.status(404).json({ message: "Slot not found" });
    if (slot.isBooked) return res.status(400).json({ message: "Slot already booked" });

    // 2. حجز الموعد مؤقتاً قبل الدفع
    slot.isBooked = true;
    slot.bookedBy = userId;
    slot.isPaid = false;
    await schedule.save();

    // 3. جلب تفاصيل المستخدم لحساب Paymob
    const userDetails = await User.findById(userId).select("name email phone");
    const [firstName, ...rest] = userDetails.name.split(" ");
    const lastName = rest.join(" ") || "User";

    // 4. حساب المبلغ الإجمالي
    const confirmationFee = doctor.price; 
    const administrativeFees = 25; 
    const totalAmount = confirmationFee + administrativeFees;
    const amount_cents = Math.round(totalAmount * 100); 

    // 5. متغيرات Paymob
    const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
    const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
    const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
    const PAYMOB_BASE_URL = "https://accept.paymob.com/api";

    // 6. الحصول على Authentication Token
    const authResp = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, { api_key: PAYMOB_API_KEY });
    const token = authResp.data.token;

    // 7. تسجيل الطلب (Order) في Paymob
    const orderResp = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
      auth_token: token,
      delivery_needed: false,
      amount_cents,
      currency: "EGP",
      merchant_order_id: `${userId}-${Date.now()}`,
      items: [{ name: `Consultation with Dr. ${doctor.name}`, amount_cents, quantity: 1 }],
    });

    const orderId = orderResp.data.id;
    slot.paymentOrderId = orderId; // حفظ Order ID لربطه بالـ Webhook
    await schedule.save();

    // 8. الحصول على Payment Key
    const payKeyResp = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
      auth_token: token,
      amount_cents,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        apartment: "NA",
        email: userDetails.email,
        floor: "NA",
        first_name: firstName,
        street: "NA",
        building: "NA",
        phone_number: userDetails.phone || "01000000000",
        shipping_method: "NA",
        postal_code: "NA",
        city: "Cairo",
        country: "EGY",
        last_name: lastName,
        state: "NA",
      },
      currency: "EGP",
      integration_id: PAYMOB_INTEGRATION_ID,
    });

    const paymentToken = payKeyResp.data.token;
    // 9. بناء رابط الدفع (Iframe URL)
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

    // 10. إرسال تفاصيل الموعد ورابط الدفع للواجهة الأمامية
    const scheduleDate = new Date(schedule.date);
    const appointmentDateStr = scheduleDate.toDateString();
    const phone = userDetails.phone || "01000000000";
    const maskedPhone = phone.replace(/\d(?=\d{3})/g, "*");

    const appointmentDetails = {
      doctor: ` ${doctor.name}`,
      appointment: `${appointmentDateStr} – ${slot.from} PM`,
      confirmationFee: `EGP ${confirmationFee}`,
      administrativeFees: `EGP ${administrativeFees}`,
      total: `EGP ${totalAmount}`,
      user: userDetails.name,
      maskedPhone,
      paymentUrl,
      orderId,
      paymentToken,
    };

    res.status(200).json({ message: "Proceed to payment (Test Mode)", appointmentDetails });

  } catch (err) {
    console.error("Booking payment error:", err.response?.data || err.message);
    res.status(500).json({ message: "Server error", error: err.response?.data || err.message });
  }
};
// =================== Paymob Webhook ===================

import crypto from "crypto";
// تأكد من استيراد crypto في بداية ملف scheduleController.js

// ------------------------------------------------------------------------
// ملاحظة هامة: يجب تعريف هذه الدالة المساعدة في مكان ما في هذا الملف 
// (عادةً قبل دالة paymobWebhook) لكي يعمل التحقق من HMAC بشكل صحيح
// ------------------------------------------------------------------------
const flattenObject = (obj, parentKey = '', result = {}) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // إذا كان المفتاح هو 'data.message' فاجعله فارغًا (حسب متطلبات paymob)
        if (newKey === 'data.message') {
            result[newKey] = '';
        } else {
            flattenObject(obj[key], newKey, result);
        }
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};
// ------------------------------------------------------------------------

export const paymobWebhook = async (req, res) => {
  try {
    const data = req.body;
    const hmacReceived = req.query.hmac;

    // متغيّرات البيئة المطلوبة
    const PAYMOB_HMAC = process.env.PAYMOB_HMAC; 

    let hmacValid = false;

    // تحقق من HMAC (الأمان)
    if (hmacReceived && PAYMOB_HMAC) {
      // إزالة حقل hmac من الكائن قبل التسطيح 
      const dataToFlatten = { ...data };
      if (dataToFlatten.hmac) delete dataToFlatten.hmac;
      
      const flatData = flattenObject(dataToFlatten);
      
      // Paymob تتطلب ترتيب مفاتيح الـ hmac حسب الترتيب الأبجدي 
      // ويجب إزالة المفاتيح التي تحتوي على object
      const hmacKeys = Object.keys(flatData).filter(key => 
          typeof flatData[key] !== 'object' || flatData[key] === null
      ).sort();
      
      const hmacString = hmacKeys.map(key => {
        let val = flatData[key];
        if (typeof val === "boolean") return val.toString();
        // Paymob تطلب معالجة خاصة لبعض القيم الفارغة أو الصفرية
        return val != null ? val.toString() : "";
      }).join("");


      const hmacCalculated = crypto.createHmac("sha512", PAYMOB_HMAC).update(hmacString).digest("hex");
      
      // *** START DEBUGGING LINES - لحل مشكلة عدم التطابق ***
      console.log("DEBUG | المفتاح من Paymob:", hmacReceived);
      console.log("DEBUG | المفتاح المحسوب بالكود:", hmacCalculated);
      console.log("DEBUG | مفتاح البيئة المُستخدم (PAYMOB_HMAC):", PAYMOB_HMAC);
      // *** END DEBUGGING LINES ***
      
      hmacValid = hmacCalculated === hmacReceived;

      if (!hmacValid) console.warn("⚠️ HMAC mismatch. فشل التحقق الأمني.");
      
    } else {
      console.warn("⚠️ HMAC check skipped (Missing ENV or Query).");
      hmacValid = false; // ✅ يجب أن تكون false لضمان الأمان في الإنتاج
    }

    if (!hmacValid) return res.status(200).send("HMAC check failed: Critical Security Error");

    // ------------------------------------------------------------------------
    // منطق تحديث قاعدة البيانات
    // ------------------------------------------------------------------------

    const orderId = data.order?.id;
    // Paymob تستخدم data.success لتحديد نجاح المعاملة
    const isSuccess = data.success ?? false; 
    const paymobTransactionId = data.id;

    // البحث عن الموعد باستخدام Paymob Order ID
    const schedule = await Schedule.findOne({ "timeSlots.paymentOrderId": orderId });
    if (!schedule) return res.status(200).send("Order not found");

    const slotIndex = schedule.timeSlots.findIndex(slot => slot.paymentOrderId == orderId);
    if (slotIndex === -1) return res.status(200).send("Slot not found");

    const slot = schedule.timeSlots[slotIndex];

    if (isSuccess) {
      slot.isBooked = true;
      slot.isPaid = true;
      slot.paymentTransactionId = paymobTransactionId || null;
    } else {
      // إذا فشلت المعاملة، قم بإلغاء حجز الموعد
      slot.isBooked = false;
      slot.isPaid = false;
      slot.bookedBy = null;
      slot.paymentOrderId = null;
      slot.paymentTransactionId = null;
    }

    await schedule.save();

    res.status(200).send("Webhook processed successfully");
  } catch (err) {
    console.error("Error processing Paymob webhook:", err);
    // تأكد دائمًا من إرسال 200 لتجنب إعادة محاولة Paymob
    res.status(200).send("Internal server error during processing"); 
  }
};
export const paymobWebhookGet = (req, res) => {
  res.status(200).send("Payment process finished. Waiting for final confirmation.");
};
