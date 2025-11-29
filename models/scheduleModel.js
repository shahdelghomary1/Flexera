import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  from: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
  to: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
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
  date: { type: String, required: true },
  timeSlots: [timeSlotSchema],
  exercises: [exerciseSchema]
}, { timestamps: true });

export default mongoose.model("Schedule", doctorScheduleSchema);
