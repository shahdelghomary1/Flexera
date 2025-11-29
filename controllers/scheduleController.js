import Schedule from "../models/scheduleModel.js";
import Doctor from "../models/doctorModel.js";
import User from "../models/userModel.js";

/// Add a new schedule for a doctor and validate time slots and update the schedule
export const addSchedule = async (req, res) => {
  try {
    const doctorId = req.user.id;

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

   
    const slotsWithBooking = req.body.timeSlots.map(slot => ({
      ...slot,
      isBooked: false
    }));

 
    const seenSlots = new Set();
    for (const slot of slotsWithBooking) {
      const key = `${slot.from}-${slot.to}`;
      if (seenSlots.has(key)) {
        return res.status(400).json({ message: `Duplicate time slot detected in request: ${key}` });
      }
      seenSlots.add(key);
    }

  
    const existingSchedule = await Schedule.findOne({ doctor: doctorId, date: req.body.date });

    if (existingSchedule) {
      for (const newSlot of slotsWithBooking) {
        for (const existingSlot of existingSchedule.timeSlots) {
          if (newSlot.from === existingSlot.from && newSlot.to === existingSlot.to) {
            return res.status(400).json({ 
              message: `This time slot already exists for the day: ${newSlot.from}-${newSlot.to}` 
            });
          }
        }
      }

   
      existingSchedule.timeSlots.push(...slotsWithBooking);
      await existingSchedule.save();

      return res.json({
        message: "Schedule updated successfully",
        schedule: existingSchedule
      });
    }

   
    const schedule = await Schedule.create({
      doctor: doctorId,
      date: req.body.date,
      timeSlots: slotsWithBooking
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

    
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

   
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (schedule.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "You cannot edit another doctor's schedule" });
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

  
    const updated = await Schedule.findByIdAndUpdate(
      scheduleId,
      {
        date: req.body.date,
        timeSlots: req.body.timeSlots
      },
      { new: true }
    );

    res.json({
      message: "Schedule updated successfully",
      schedule: updated
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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
    // جلب جدول المواعيد للطبيب الحالي
    const doctorId = req.user._id;
    
    // 🎯 التعديل المطلوب: استخدام populate لجلب معلومات اليوزر المحجوزة
    const schedules = await Schedule.find({ doctor: doctorId })
      .populate({
        path: 'timeSlots.bookedBy', // الوصول إلى الحقل bookedBy داخل كل timeSlot
        select: 'name image email'  // جلب اسم اليوزر، صورته، وإيميله
      })
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



export const cancelBookedTimeSlot = async (req, res) => {
    try {
        const { scheduleId, from, to } = req.body;
        const userId = req.user.id; 

        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        const slotIndex = schedule.timeSlots.findIndex(
            slot => slot.from === from && slot.to === to && slot.bookedBy.toString() === userId.toString()
        );

        if (slotIndex === -1) {
            return res.status(404).json({ message: "Booked time slot not found for this user" });
        }

        schedule.timeSlots[slotIndex].isBooked = false;
        schedule.timeSlots[slotIndex].bookedBy = null; // إزالة مرجع اليوزر

        await schedule.save();

        res.json({ message: "Time slot cancelled successfully", schedule });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
export const getAppointmentsForDoctor = async (req, res) => {
    try {
      
        const doctorId = req.user.id; 

     
        const schedules = await Schedule.find({ 
            doctor: doctorId 
        })
        .select('date timeSlots') 
        .populate({
            path: 'timeSlots.bookedBy',
            select: 'name image medicalFile' 
        })
        .sort({ date: 1 });

        if (!schedules.length) {
            return res.status(404).json({ message: "No schedules found" });
        }

        const bookedAppointments = [];

        schedules.forEach(schedule => {
            schedule.timeSlots.forEach(slot => {
               
                if (slot.isBooked && slot.bookedBy) {
                    bookedAppointments.push({
                        date: schedule.date,
                        from: slot.from,
                        to: slot.to,
                        user: slot.bookedBy, 
                        slotId: slot._id
                    });
                }
            });
        });

        res.status(200).json({
            message: "Booked appointments fetched successfully",
            appointments: bookedAppointments
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


export const bookTimeSlot = async (req, res) => {
  try {
    const { doctorId, date, from, to } = req.body;
    const userId = req.user._id; 

    
    if (!doctorId || !date || !from || !to) {
      return res.status(400).json({ message: "All fields are required" });
    }

    
    const schedule = await Schedule.findOne({ doctor: doctorId, date });

    if (!schedule) {
      return res.status(404).json({ message: "No schedule found for this date" });
    }

   
    const slotIndex = schedule.timeSlots.findIndex(slot => slot.from === from && slot.to === to);

    if (slotIndex === -1) {
      return res.status(404).json({ message: "Time slot not found" });
    }

  
    if (schedule.timeSlots[slotIndex].isBooked) {
      return res.status(400).json({ message: "Time slot already booked" });
    }
    schedule.timeSlots[slotIndex].isBooked = true;
    schedule.timeSlots[slotIndex].bookedBy = userId; 
    await schedule.save();

    res.json({ message: "Time slot booked successfully", schedule });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



