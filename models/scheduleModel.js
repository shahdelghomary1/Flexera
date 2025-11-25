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
  timeSlots: [timeSlotSchema],
  exercises: [{ type: String }]
}, { timestamps: true });

export default mongoose.model("Schedule", doctorScheduleSchema);
