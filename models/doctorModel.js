import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const doctorSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  image: { type: String },
  password: { type: String }, 
   price: { type: Number, required: true },
  dateOfBirth: { type: Date }, 
  gender: { type: String, enum: ["Female", "Male"] }, 

  resetOTP: { type: String },
  resetOTPExpires: { type: Date }
}, { timestamps: true });


doctorSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

doctorSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Doctor", doctorSchema);
