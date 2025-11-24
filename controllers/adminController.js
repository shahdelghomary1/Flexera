// controllers/adminController.js
import Doctor from "../models/doctorModel.js";
import User from "../models/userModel.js";


/**
 * Get all doctors
 * @return {object} - JSON response containing all doctors
 * @throws {object} - Server error response
 */
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json({ doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addDoctor = async (req, res) => {
  try {
    const { name, email, speciality, phone, bio } = req.body;
    const exists = await Doctor.findOne({ email });
    if (exists) return res.status(400).json({ message: "Doctor email already exists" });

    const doctor = await Doctor.create({ name, email, speciality, phone, bio });
    res.status(201).json({ message: "Doctor added", doctor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Doctor.findById(id);
    if (!doc) return res.status(404).json({ message: "Doctor not found" });
    await doc.remove();
    res.json({ message: "Doctor removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const doc = await Doctor.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ message: "Doctor not found" });
    res.json({ message: "Doctor updated", doctor: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("name email phone dob"); 
    const usersWithAge = users.map(user => {
      const age = user.dob
        ? new Date().getFullYear() - new Date(user.dob).getFullYear()
        : null;
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "N/A", 
        age
      };
    });
    res.json({ users: usersWithAge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

