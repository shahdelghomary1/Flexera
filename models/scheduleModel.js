import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  from: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
  to: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  price: { type: Number }, 
  paymentStatus: { type: String, default: "pending" }, 
  orderId: { type: String },  
  transactionId: { type: String },
  bookingTime: { type: Date, default: null }

});


const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number },
  reps: { type: Number },
  notes: { type: String }
});

const doctorScheduleSchema = new mongoose.Schema({
  doctor: {
    type: String,
    ref: "Doctor",
    required: true
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  date: { type: String, required: true },
  timeSlots: [timeSlotSchema],
  exercises: [
    {
      name: { type: String, required: true },
      sets: { type: Number },
      reps: { type: Number },
      notes: { type: String },
      category: { type: String , required: true}
    }]
}, { timestamps: true });

export default mongoose.model("Schedule", doctorScheduleSchema);
