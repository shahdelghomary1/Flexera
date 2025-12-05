// controllers/paymobController.js
import axios from "axios";
import crypto from "crypto";
import Schedule from "../models/scheduleModel.js";
import Doctor from "../models/doctorModel.js";
import { PAYMOB } from "../utils/paymobConfig.js";

// ---------------------------------------------------------
// Generate Paymob Auth Token
// ---------------------------------------------------------
const getAuthToken = async () => {
  const res = await axios.post(`${PAYMOB.API_URL}/auth/tokens`, {
    api_key: PAYMOB.API_KEY,
  });
  return res.data.token;
};

// ---------------------------------------------------------
// Create Order
// ---------------------------------------------------------
const createOrder = async (authToken, amountCents) => {
  const res = await axios.post(`${PAYMOB.API_URL}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: "EGP",
    items: [],
  });
  return res.data;
};

// ---------------------------------------------------------
// Payment Key
// ---------------------------------------------------------
const getPaymentKey = async (authToken, orderId, amountCents, billingData) => {
  const res = await axios.post(`${PAYMOB.API_URL}/acceptance/payment_keys`, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: billingData,
    currency: "EGP",
    integration_id: PAYMOB.INTEGRATION_ID,
  });

  return res.data.token;
};

// ---------------------------------------------------------
// INIT PAYMENT after selecting doctor + date + time
// ---------------------------------------------------------
export const initPayment = async (req, res) => {
  try {
    const { doctorId, date, from } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const schedule = await Schedule.findOne({ doctor: doctorId, date });
    if (!schedule)
      return res.status(404).json({ message: "No schedule found" });

    const slot = schedule.timeSlots.find((s) => s.from === from);
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    if (slot.isBooked)
      return res.status(400).json({ message: "Slot is already booked" });

    const amountCents = doctor.price * 100;

    const billingData = {
      first_name: req.user.name,
      last_name: req.user.name,
      email: req.user.email,
      phone_number: req.user.phone || "01200000000",
      apartment: "NA",
      floor: "NA",
      street: "NA",
      building: "NA",
      shipping_method: "NA",
      postal_code: "NA",
      city: "NA",
      country: "EG",
      state: "NA",
    };

    const authToken = await getAuthToken();
    const order = await createOrder(authToken, amountCents);
    const paymentKey = await getPaymentKey(authToken, order.id, amountCents, billingData);

    // Store temporary pending payment
    slot.price = doctor.price;
    slot.paymentStatus = "pending";
    slot.orderId = order.id.toString(); // ✅ اجعل orderId دائماً String لتجنب مشاكل Mongoose

    await schedule.save();

    const iframeUrl = `${PAYMOB.IFRAME_URL}${PAYMOB.IFRAME_ID}?payment_token=${paymentKey}`;

    res.json({
      success: true,
      payment_url: iframeUrl,
      payment_token: paymentKey,
      order_id: order.id,
      price: doctor.price,
    });
  } catch (err) {
    console.log(err?.response?.data || err);
    res.status(500).json({ message: "Payment init failed", error: err.message });
  }
};

// ---------------------------------------------------------
// Verify HMAC
// ---------------------------------------------------------
const verifyHmac = (data) => {
  const hmacString =
    data.amount_cents +
    data.created_at +
    data.currency +
    data.error_occured +
    data.has_parent_transaction +
    data.id +
    data.integration_id +
    data.is_3d_secure +
    data.is_auth +
    data.is_capture +
    data.is_refunded +
    data.is_standalone_payment +
    data.is_voided +
    data.order +
    data.owner +
    data.pending +
    data.source_data_pan +
    data.source_data_sub_type +
    data.source_data_type +
    data.success;

  const expected = crypto
    .createHmac("sha512", PAYMOB.HMAC_SECRET)
    .update(hmacString)
    .digest("hex");

  return expected === data.hmac;
};

// ---------------------------------------------------------
// CALLBACK — Paymob POST
// ---------------------------------------------------------
// ---------------------------------------------------------
// CALLBACK — book slot only if payment success
// ---------------------------------------------------------
export const paymobCallback = async (req, res) => {
  try {
    console.log("💥 CALLBACK RECEIVED:", req.body);

    // بعض النسخ من Paymob تبعت البيانات مباشرة في req.body
    // وبعضها جوه obj
    const data = req.body.obj || req.body;

    // تحويل orderId لـ string لضمان عدم حدوث CastError
    const orderId = (data.order?.id || data.order)?.toString();

    if (!data.success) {
      console.log("Payment failed for order:", orderId);
      return res.json({ success: false, message: "Payment failed" });
    }

    // البحث عن الـ schedule اللي فيه الـ orderId
    const schedule = await Schedule.findOne({
      "timeSlots.orderId": orderId,
    });

    if (!schedule) {
      console.log("Pending booking not found for order:", orderId);
      return res.status(404).json({ message: "Pending booking not found" });
    }

    const slot = schedule.timeSlots.find((s) => s.orderId === orderId);
    if (!slot) {
      console.log("Slot not found for order:", orderId);
      return res.status(404).json({ message: "Slot not found" });
    }

    // تحديث حالة الحجز
    slot.isBooked = true;
    slot.paymentStatus = "paid";
    slot.transactionId = data.id;

    await schedule.save();

    console.log("✅ Payment successful and slot booked for order:", orderId);

    res.json({
      success: true,
      message: "Payment successful and slot booked!",
      orderId,
      transactionId: data.id,
      price: slot.price,
    });
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ message: "Callback error", error: err.message });
  }
};

