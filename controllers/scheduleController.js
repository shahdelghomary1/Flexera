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



const PAYMOB_API_KEY =
  "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFeE1qWTRPQ3dpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS54dm9JS2k5SVhpNE1xVlBJV29zNklfV19WRHJQS0xEODFyZVVsVjZFV3k0NndUakppS3QxdkxMU3hRQmp1d0NnTVZxc1RuRVh0UC1UZGRTVHU5YndGUQ==";

const PAYMOB_INTEGRATION_ID = 5423306;
const PAYMOB_IFRAME_ID = 984851;

const PAYMOB_BASE_URL = "https://accept.paymob.com/api";

export const bookAndPayTimeSlot = async (req, res) => {
  try {
    const { doctorId, date, from } = req.body;
    const userId = req.user._id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const schedule = await Schedule.findOne({ doctor: doctorId, date });
    if (!schedule) return res.status(404).json({ message: "No schedule found" });

    const slot = schedule.timeSlots.find(s => s.from === from);
    if (!slot) return res.status(404).json({ message: "Slot not found" });
    if (slot.isBooked) return res.status(400).json({ message: "Slot already booked" });

    const userDetails = await User.findById(userId).select("name email phone");
    const [firstName, ...rest] = userDetails.name.split(" ");
    const lastName = rest.join(" ") || "User";

    const amount_cents = Math.round(doctor.price * 100);

    // 1️⃣ Paymob Auth Token
    const auth = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
      api_key: PAYMOB_API_KEY,
    });
    const token = auth.data.token;

    // 2️⃣ Order
    const orderRes = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
      auth_token: token,
      delivery_needed: false,
      amount_cents,
      currency: "EGP",
      merchant_order_id: `${userId}-${Date.now()}`,
      items: [
        {
          name: `Consultation with Dr. ${doctor.name}`,
          amount_cents,
          quantity: 1,
        },
      ],
    });

    const orderId = orderRes.data.id;

    // نحفظ orderId في الـ slot
    slot.paymentOrderId = orderId;
    slot.bookedBy = userId;
    slot.isBooked = true;
    await schedule.save();

    // 3️⃣ Payment Key
    const payKeyRes = await axios.post(
      `${PAYMOB_BASE_URL}/acceptance/payment_keys`,
      {
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
      }
    );

    const paymentToken = payKeyRes.data.token;

    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

    return res.json({
      message: "Proceed to payment",
      paymentUrl,
      orderId,
      paymentToken,
    });
  } catch (err) {
    console.error("Paymob Error:", err.response?.data || err);
    res.status(500).json({
      message: "Payment error",
      error: err.response?.data,
    });
  }
};



// ==== Helper: Flatten Object ====
function flattenObject(obj, prefix = "") {
  let result = {};

  for (let key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }

  return result;
}

export const paymobWebhook = async (req, res) => {
  try {
    const data = req.body;
    console.log("✅ Received webhook data:", JSON.stringify(data, null, 2));

    const receivedHmac = data.hmac;
    console.log("Received HMAC:", receivedHmac);

    // 1️⃣ Remove hmac from data
    let copy = { ...data };
    delete copy.hmac;
    console.log("Data after removing HMAC:", JSON.stringify(copy, null, 2));

    // 2️⃣ Flatten nested objects
    const flat = flattenObject(copy);
    console.log("Flattened data:", JSON.stringify(flat, null, 2));

    // 3️⃣ Sort alphabetically
    const sortedKeys = Object.keys(flat).sort();
    console.log("Sorted keys:", sortedKeys);

    // 4️⃣ Join values
    const concatenated = sortedKeys.map((k) => flat[k]).join("");
    console.log("Concatenated values for HMAC:", concatenated);

    // 5️⃣ Calculate HMAC
    const calculatedHmac = crypto
      .createHmac("sha512", process.env.PAYMOB_HMAC)
      .update(concatenated)
      .digest("hex");

    console.log("Calculated HMAC:", calculatedHmac);

    if (calculatedHmac !== receivedHmac) {
      console.log("❌ HMAC MISMATCH");
      return res.status(200).send("HMAC mismatch");
    }

    console.log("✅ HMAC VERIFIED");

    // --------------------------
    //    HANDLE PAYMENT RESULT
    // --------------------------
    const isSuccess = data.obj?.success;
    const orderId = data.obj?.order?.id;

    const schedule = await Schedule.findOne({
      "timeSlots.paymentOrderId": orderId,
    });

    if (!schedule) return res.status(200).send("Order not found");

    const slot = schedule.timeSlots.find((s) => s.paymentOrderId == orderId);
    if (!slot) return res.status(200).send("Slot not found");

    if (isSuccess) {
      slot.isPaid = true;
      console.log("💰 Payment SUCCESS");
    } else {
      slot.isPaid = false;
      slot.isBooked = false;
      slot.bookedBy = null;
      slot.paymentOrderId = null;
      console.log("❌ Payment FAILED → Rolled Back");
    }

    await schedule.save();

    res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).send("Server error");
  }
};

export const bookPay = async (req, res) => {
  try {
    const { doctorId, date, slotId, price, billing } = req.body;

    // 1️⃣ جلب schedule
    const schedule = await Schedule.findOne({ doctor: doctorId, date });
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const slot = schedule.timeSlots.find(s => s._id.toString() === slotId);
    if (!slot) return res.status(404).json({ message: "Slot not found" });
    if (slot.isBooked) return res.status(400).json({ message: "Slot already booked" });

    // 2️⃣ حدث slot ليكون محجوز مؤقتًا
    slot.isBooked = true;
    slot.bookedBy = req.user.id; // لازم يكون عندك middleware للتحقق من user
    slot.isPaid = false;
    await schedule.save();

    // 3️⃣ جهز بيانات الدفع لـ Paymob Sandbox
    const authToken = process.env.PAYMOB_SANDBOX_TOKEN; // حط توكن sandbox هنا
    const orderData = {
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: price * 100,
      currency: "EGP",
      items: []
    };

    // 4️⃣ إنشاء Order
    const orderResp = await axios.post(
      "https://accept.paymob.com/api/ecommerce/orders",
      orderData
    );

    const orderId = orderResp.data.id;

    // 5️⃣ إنشاء Payment Key
    const paymentKeyData = {
      auth_token: authToken,
      amount_cents: price * 100,
      expiration: 3600,
      order_id: orderId,
      billing_data: billing,
      currency: "EGP",
      integration_id: process.env.PAYMOB_INTEGRATION_ID
    };

    const paymentKeyResp = await axios.post(
      "https://accept.paymob.com/api/acceptance/payment_keys",
      paymentKeyData
    );

    const paymentToken = paymentKeyResp.data.token;

    // 6️⃣ جهز رابط الدفع
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/984851?payment_token=${paymentToken}`;

    res.status(200).json({
      message: "Proceed to payment",
      paymentUrl,
      orderId,
      paymentToken
    });

  } catch (err) {
    console.error("Booking payment error:", err.response?.data || err.message);
    res.status(500).json({ message: "Server error", error: err.response?.data || err.message });
  }
};
