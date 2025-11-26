import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  from: { type: String, required: true }, 
  to: { type: String, required: true }    
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
  date: {
    type: String, 
    required: true
  },
  timeSlots: [
  {
    from: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:MM 24-hour format
    },
    to: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:MM 24-hour format
    }
  }
]

}, { timestamps: true });

export default mongoose.model("Schedule", doctorScheduleSchema);
