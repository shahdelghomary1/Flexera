import mongoose from "mongoose";


const doctorSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // دلوقتي ممكن نحدد ID بنفسنا
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  image: { type: String },
}, { timestamps: true });

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;
