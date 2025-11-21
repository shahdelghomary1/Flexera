// controllers/doctorController.js
import Doctor from "../models/doctorModel.js";

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
