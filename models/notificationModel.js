import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  
 
  doctor: {
    type: String, 
    ref: "Doctor",
    default: null,
  },
  
 
  type: {
    type: String,
    required: true,
  },
 
  message: {
    type: String,
    required: true,
  },
  
 
  data: {
    type: Object, 
    default: {},
  },
  

  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true }); 

export default mongoose.model("Notification", notificationSchema);