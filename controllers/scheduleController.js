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



// export const bookAndPayTimeSlot = async (req, res) => {
//   try {
//     console.log("Request body:", req.body);

//     const { doctorId, date, from } = req.body;
//     const userId = req.user._id;

//     const doctor = await Doctor.findById(doctorId);
//     if (!doctor) {
//       console.log("Doctor not found:", doctorId);
//       return res.status(404).json({ message: "Doctor not found" });
//     }

//     let schedule = await Schedule.findOne({ doctor: doctorId, date });
//     if (!schedule) {
//       console.log("No schedule found for date:", date);
//       return res.status(404).json({ message: "No schedule found for this date" });
//     }

//     const slotIndex = schedule.timeSlots.findIndex(slot => slot.from === from);
//     if (slotIndex === -1) {
//       console.log("Time slot not found:", from);
//       return res.status(404).json({ message: "Time slot not found" });
//     }
//     if (schedule.timeSlots[slotIndex].isBooked) {
//       console.log("Time slot already booked:", from);
//       return res.status(400).json({ message: "Time slot already booked" });
//     }

//     console.log("Creating Paymob order...");
//     const authResponse = await axios.post(
//       "https://accept.paymob.com/api/auth/tokens",
//       { api_key: process.env.PAYMOB_API_KEY }
//     );
//     const token = authResponse.data.token;
//     console.log("Paymob auth token:", token);

//     const orderResponse = await axios.post(
//       "https://accept.paymob.com/api/ecommerce/orders",
//       {
//         auth_token: token,
//         delivery_needed: false,
//         amount_cents: doctor.price * 100,
//         currency: "EGP",
//         items: [{ name: `Consultation with Dr. ${doctor.name}`, amount_cents: doctor.price * 100, quantity: 1 }]
//       }
//     );
//     const orderId = orderResponse.data.id;
//     console.log("Paymob orderId:", orderId);

//     const paymentKeyResponse = await axios.post(
//       "https://accept.paymob.com/api/acceptance/payment_keys",
//       {
//         auth_token: token,
//         amount_cents: doctor.price * 100,
//         expiration: 3600,
//         order_id: orderId,
//         billing_data: {
//           first_name: req.user.name,
//           email: req.user.email,
//           phone_number: req.user.phone
//         },
//         currency: "EGP",
//         integration_id: process.env.PAYMOB_INTEGRATION_ID
//       }
//     );

//     const paymentToken = paymentKeyResponse.data.token;
//     console.log("Paymob paymentToken:", paymentToken);

//     // Save orderId in slot
//     schedule.timeSlots[slotIndex].paymentOrderId = orderId;
//     await schedule.save();
//     console.log("Schedule updated with payment orderId");

//     res.status(200).json({
//       message: "Proceed to payment",
//       paymentToken,
//       orderId,
//       amount: doctor.price
//     });

//   } catch (err) {
//     console.error("Paymob Error:", err.response?.data || err.message);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // Step 6: Paymob webhook to confirm payment
// export const paymobWebhook = async (req, res) => {
//   const { order } = req.body; // حسب Paymob webhook structure
//   const { order_id, success } = order;

//   if (success) {
//     // Find the schedule & slot with this order_id
//     const schedule = await Schedule.findOne({ "timeSlots.paymentOrderId": order_id });
//     if (schedule) {
//       const slot = schedule.timeSlots.find(slot => slot.paymentOrderId === order_id);
//       if (slot) {
//         slot.isPaid = true;
//         slot.isBooked = true;
//         slot.bookedBy = order.userId || null; // لو عايزة تمرري userId من الفرونت
//         await schedule.save();
//       }
//     }
//   }

//   res.status(200).json({ received: true });
// };



// -----------------------------------------------------
// 💡 إعدادات Paymob (باستخدام المفاتيح التي زودتنا بها)
// يفضل نقلها إلى ملف .env واستخدام process.env
const PAYMOB_API_KEY = "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFeE1qWTRPQ3dpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS54dm9JS2k5SVhpNE1xVlBJV29zNklfV19WRHJQS0xEODFyZVVsVjZFV3k0NndUakppS3QxdkxMU3hRQmp1d0NnTVZxc1RuRVh0UC1UZGRTVHU5YndGUQ==";
const PAYMOB_INTEGRATION_ID = 5423306;
const PAYMOB_IFRAME_ID = 984851;
const PAYMOB_HMAC = "D0AD002C9EFCDFEB19E6AAFFE4BDC0AF";
const PAYMOB_BASE_URL = "https://accept.paymob.com/api";
// -----------------------------------------------------

// ... (بقية الدوال مثل addSchedule, getDoctorSchedule, إلخ) ...

export const bookAndPayTimeSlot = async (req, res) => {
  let schedule, slotIndex; // تعريف المتغيرات لتكون متاحة في Catch Block
  try {
    const { doctorId, date, from } = req.body;
    const userId = req.user._id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    schedule = await Schedule.findOne({ doctor: doctorId, date });
    if (!schedule) {
      return res.status(404).json({ message: "No schedule found for this date" });
    }

    slotIndex = schedule.timeSlots.findIndex(slot => slot.from === from);
    if (slotIndex === -1) {
      return res.status(404).json({ message: "Time slot not found" });
    }
    if (schedule.timeSlots[slotIndex].isBooked) {
      return res.status(400).json({ message: "Time slot already booked" });
    }
    
    // 💡 الحصول على بيانات المستخدم كاملة لـ Billing Data
    const userDetails = await User.findById(userId).select("name email phone");
    const [firstName, ...lastNameParts] = userDetails.name.split(" ");
    const lastName = lastNameParts.join(" ") || "Name";

    // حساب المبلغ بالسنت (أو المليم)
    const amount_cents = Math.round(doctor.price * 100);

    // 1. Get Auth Token
    const authResponse = await axios.post(
      `${PAYMOB_BASE_URL}/auth/tokens`,
      { api_key: PAYMOB_API_KEY }
    );
    const token = authResponse.data.token;

    // 2. Register Order
    const orderResponse = await axios.post(
      `${PAYMOB_BASE_URL}/ecommerce/orders`,
      {
        auth_token: token,
        delivery_needed: false,
        amount_cents: amount_cents,
        currency: "EGP",
        // يجب أن يكون Merchant Order ID فريدًا محلياً. نستخدمه لربط الـ Webhook
        merchant_order_id: `${userId}-${Date.now()}`, 
        items: [{ name: `Consultation with Dr. ${doctor.name}`, amount_cents: amount_cents, quantity: 1 }]
      }
    );
    const orderId = orderResponse.data.id;

    // 3. Get Payment Key (الإصلاح الرئيسي لخطأ 400)
    const paymentKeyResponse = await axios.post(
      `${PAYMOB_BASE_URL}/acceptance/payment_keys`,
      {
        auth_token: token,
        amount_cents: amount_cents,
        expiration: 3600, // ساعة واحدة
        order_id: orderId,
        
        // 🚨 إرسال جميع حقول الفواتير المطلوبة
        billing_data: {
          apartment: "NA", 
          email: userDetails.email || "user@example.com", 
          floor: "NA", 
          first_name: firstName || "User", 
          street: "NA", 
          building: "NA", 
          phone_number: userDetails.phone || "01000000000", 
          shipping_method: "NA",
          postal_code: "NA", 
          city: "Cairo", 
          country: "EGY", 
          last_name: lastName, 
          state: "NA"
        },
        currency: "EGP",
        integration_id: PAYMOB_INTEGRATION_ID
      }
    );

    const paymentToken = paymentKeyResponse.data.token;

    // 4. الحجز المؤقت وتحديث Schedule
    schedule.timeSlots[slotIndex].paymentOrderId = orderId;
    schedule.timeSlots[slotIndex].isBooked = true; // حجز مؤقت
    schedule.timeSlots[slotIndex].bookedBy = userId; 
    await schedule.save();
    
    // 5. إرجاع رابط iFrame النهائي
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

    res.status(200).json({
      message: "Proceed to payment",
      paymentToken,
      orderId,
      amount: doctor.price,
      paymentUrl // 💡 رابط الدفع الذي يجب فتحه في الفرونت إند
    });

  } catch (err) {
    console.error("Paymob Error:", err.response?.data || err.message);
    
    // 💡 منطق Rollback: إلغاء الحجز المؤقت في حال فشل أي خطوة من Paymob
    if (schedule && slotIndex !== undefined && slotIndex !== -1) {
        schedule.timeSlots[slotIndex].isBooked = false;
        schedule.timeSlots[slotIndex].bookedBy = null;
        schedule.timeSlots[slotIndex].paymentOrderId = null;
        await schedule.save();
    }

    const errorDetails = err.response?.data || { message: err.message };
    res.status(500).json({ 
        message: "Server error during payment initiation. Temporary booking has been cancelled.", 
        error: errorDetails
    });
  }
};


// Step 6: Paymob webhook to confirm payment (مع التحقق من HMAC)
export const paymobWebhook = async (req, res) => {
    // 💡 سجل: بدأ تنفيذ الدالة - مهم جداً لمتابعة دخول الطلب
    console.log("PAYMOB WEBHOOK RECEIVED. Query Data:", req.query); 

    const hmacReceived = req.query.hmac;
    const transaction = req.query; 

    // 1. بناء سلسلة البيانات للتحقق من HMAC
    const hmacKeys = [
        "amount_cents", "created_at", "currency", "error_lapsed", "has_parent_transaction",
        "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_expired",
        "is_fee_refunded", "is_voided", "is_refunded", "is_standalone_payment",
        "is_service_at_source", "is_settled", "is_success", "order", "owner",
        "pending", "source_data_pan", "source_data_sub_type", "source_data_type", "data_message"
    ];

    const hmacString = hmacKeys.map(key => transaction[key]).join("");
    
    // 2. حساب HMAC والتحقق منه
    const hmacCalculated = crypto
        .createHmac("sha512", PAYMOB_HMAC) 
        .update(hmacString)
        .digest("hex");
        
    // 💡 سجل: مقارنة مفاتيح HMAC
    console.log(`HMAC Received: ${hmacReceived}`);
    console.log(`HMAC Calculated: ${hmacCalculated}`);
    console.log(`HMAC Match: ${hmacCalculated === hmacReceived}`);


    if (hmacCalculated !== hmacReceived) {
        console.error("Paymob Webhook ERROR: HMAC mismatch. Possible tampering.");
        // إذا فشل HMAC، يخرج من هنا ويرد بـ 200 لمنع إعادة الإرسال
        return res.status(200).send("HMAC check failed."); 
    }
    
    // 💡 سجل: نجح التحقق
    console.log("HMAC check SUCCESSFUL. Starting DB process."); 

    // 3. تحليل بيانات Webhook
    const isSuccess = transaction.is_success === 'true'; // يتم إرسالها كسلسلة
    const orderId = transaction.order; 
    const paymobTransactionId = transaction.id;
    
    // البحث عن الموعد باستخدام Paymob Order ID
    const schedule = await Schedule.findOne({ "timeSlots.paymentOrderId": orderId });

    if (!schedule) {
        console.warn(`Webhook received for unknown order: ${orderId}`);
        return res.status(200).send("Order not found");
    }

    const slotIndex = schedule.timeSlots.findIndex(slot => slot.paymentOrderId == orderId);

    const slot = schedule.timeSlots[slotIndex];

    try {
        if (isSuccess) {
            
            // 💡 سجل: حالة الدفع ناجحة
            console.log(`Processing SUCCESS payment for Order ID: ${orderId}`);
            
            // 4. إتمام الحجز (تأكيد الدفع)
            slot.isBooked = true; 
            slot.isPaid = true; 
            slot.paymentTransactionId = paymobTransactionId; 
            
            await schedule.save();

            console.log(`Payment SUCCESS for Paymob Order ID: ${orderId}. Booking confirmed.`);
            
        } else {
             // 5. فشل الدفع، إلغاء الحجز المؤقت (Rollback)
            slot.isBooked = false; 
            slot.isPaid = false; 
            slot.bookedBy = null;
            slot.paymentOrderId = null; 
            
            await schedule.save();
            
            console.log(`Payment FAILED for Paymob Order ID: ${orderId}. Booking rolled back.`);
        }
        
        // 🚨 الاستجابة بـ 200 OK ضرورية لإخبار Paymob بأننا استلمنا الطلب
        res.status(200).send("Webhook processed successfully");

    } catch (error) {
        console.error("Error processing Paymob webhook in DB:", error);
        // حتى لو حدث خطأ في DB، نرد بـ 200 لمنع الإرسال المتكرر
        res.status(200).send("Processing error");
    }
};





