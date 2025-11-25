import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  gender: { type: String, enum: ["male", "female"] },
  dob: { type: Date },
  height: { type: Number },
  weight: { type: Number },
  phone: { type: String },
  image: { type: String }, 
  medicalFile: { type: String }, 
  resetOTP: { type: String },
  resetOTPExpires: { type: Date }
}, { timestamps: true });
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;

