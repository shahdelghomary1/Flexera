import Schedule from "../models/scheduleModel.js";
import Doctor from "../models/doctorModel.js";
import User from "../models/userModel.js";
export const addSchedule = async (req, res) => {
  try {
    const doctorId = req.body.doctorId; 

    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const timeToMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    for (const slot of req.body.timeSlots) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(slot.from) || !timeRegex.test(slot.to)) {
        return res.status(400).json({ 
          message: `Invalid time format in slot ${JSON.stringify(slot)}` 
        });
      }

      const fromMinutes = timeToMinutes(slot.from);
      const toMinutes = timeToMinutes(slot.to);

      if (toMinutes <= fromMinutes) {
        return res.status(400).json({ 
          message: `Invalid slot: 'to' must be after 'from' in slot ${JSON.stringify(slot)}` 
        });
      }
    }

    const schedule = await Schedule.create({
      doctor: doctorId,
      date: req.body.date,
      timeSlots: req.body.timeSlots
    });

    res.json({
      message: "Schedule added successfully",
      schedule
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const getDoctorSchedule = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.user._id; 
    const schedules = await Schedule.find({ doctor: doctorId });

    res.json({
      message: "Doctor schedule fetched",
      schedules
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    const timeToMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    for (const slot of req.body.timeSlots) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(slot.from) || !timeRegex.test(slot.to)) {
        return res.status(400).json({ 
          message: `Invalid time format in slot ${JSON.stringify(slot)}` 
        });
      }

      const fromMinutes = timeToMinutes(slot.from);
      const toMinutes = timeToMinutes(slot.to);

      if (toMinutes <= fromMinutes) {
        return res.status(400).json({ 
          message: `Invalid slot: 'to' must be after 'from' in slot ${JSON.stringify(slot)}` 
        });
      }
    }

    const updated = await Schedule.findByIdAndUpdate(
      scheduleId,
      {
        date: req.body.date,
        timeSlots: req.body.timeSlots
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Schedule not found" });

    res.json({
      message: "Schedule updated successfully",
      schedule: updated
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, timeSlots } = req.body;
    const userId = req.user._id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const schedule = await Schedule.create({
      doctor: doctorId,
      user: userId,
      date,
      timeSlots,
    });

    res.status(201).json({
      message: "Appointment booked successfully",
      schedule,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;

    const schedules = await Schedule.find({ user: userId })
      .populate("doctor", "name  image");

    res.status(200).json({
      message: "User appointments fetched",
      schedules,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const schedules = await Schedule.find({ doctor: doctorId })
      .populate("user", "name image")
      .sort({ date: 1 });

    res.json({
      message: "Doctor appointments fetched",
      schedules
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params; 
    const appointment = await Schedule.findByIdAndDelete(id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addExercisesToAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { exercises } = req.body; 

    const appointment = await Schedule.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

 
    appointment.exercises = exercises; 
    await appointment.save();

    res.status(200).json({ message: "Exercises added", appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getAppointmentsForDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const appointments = await Schedule.find({ doctor: doctorId })
      .populate("user", "name image medicalFile")
      .sort({ date: 1 });

    if (!appointments.length)
      return res.status(404).json({ message: "No appointments found" });

    res.status(200).json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


