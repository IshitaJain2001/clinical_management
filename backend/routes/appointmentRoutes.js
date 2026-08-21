const express = require('express');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();



router.use(verifyToken);

// Get all appointments (optionally filter by doctorId or patientId, scoped to tenant)
router.get('/', async (req, res) => {
  try {


    const query = {};
    let patientIds = [];
    
    // Cross-tenant patient scope: if requesting user is patient, find all their appointments by contact
    if (req.user && req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const patientDocs = await Patient.find({ contact: req.user.staff_id });
      patientIds = patientDocs.map(p => p._id.toString());
      if (req.user.id) patientIds.push(req.user.id.toString());

      if (req.query.doctorId) {
        query.doctorId = req.query.doctorId;
      } else {
        query.patientId = { $in: patientIds };
      }
    } else {
      query.tenantId = req.tenantId;
      if (req.query.doctorId) query.doctorId = req.query.doctorId;
      if (req.query.patientId) query.patientId = req.query.patientId;

      // Server-side enforcement: if the requesting user is a doctor and no
      // explicit doctorId filter was provided, automatically scope to their
      // own appointments so one doctor cannot see another's appointments.
      // However, if the doctor has receptionist coverage, they must be allowed
      // to view all appointments for the clinic.
      if (req.user && req.user.role === 'doctor' && !req.query.doctorId) {
        let hasReceptionistCoverage = false;
        try {
          const RoleCoverage = require('../models/RoleCoverage');
          const coverage = await RoleCoverage.findOne({ tenantId: req.tenantId });
          if (coverage && coverage.state) {
            const userName = req.user.name || '';
            const matchKey = Object.keys(coverage.state).find(
              k => k.toLowerCase().trim() === userName.toLowerCase().trim()
            );
            const staffPerms = matchKey ? coverage.state[matchKey] : null;
            if (staffPerms) {
              const now = new Date();
              hasReceptionistCoverage = Object.keys(staffPerms).some(permId => {
                const perm = staffPerms[permId];
                if (perm && perm.on && permId.startsWith('rc-')) {
                  if (perm.type === 'temp' && perm.expiresAt) {
                    return new Date(perm.expiresAt) > now;
                  }
                  return true;
                }
                return false;
              });
            }
          }
        } catch (err) {
          console.error("Failed to check receptionist coverage in appointments route:", err);
        }

        if (!hasReceptionistCoverage) {
          query.doctorId = req.user.id;
        }
      }
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name contact age ageMonths ageDays gender email address bloodGroup allergies currentMedications medicalHistory avatar referredBy patientId')
      .populate('doctorId', 'name role specialty consultationFee')
      .sort({ date: 1, time: 1 });

    // Join billingStatus from Billing records
    const Billing = require('../models/Billing');
    const appointmentIds = appointments.map(a => a._id);
    const bills = await Billing.find({ appointmentId: { $in: appointmentIds } });
    
    const billingMap = {};
    bills.forEach(b => {
      if (b.appointmentId) {
        const key = b.appointmentId.toString();
        // Prefer 'Paid' status if any bill for this appointment is Paid
        if (!billingMap[key] || b.status === 'Paid') {
          billingMap[key] = b.status;
        }
      }
    });

    let appsWithBilling = appointments.map(app => {
      const appObj = app.toObject();
      appObj.billingStatus = billingMap[app._id.toString()] || 'Unpaid';
      return appObj;
    });

    if (req.user && req.user.role === 'patient' && req.query.doctorId) {
      appsWithBilling = appsWithBilling.map(app => {
        const appPatientIdStr = String(app.patientId?._id || app.patientId);
        const isOwn = patientIds.includes(appPatientIdStr);
        if (!isOwn) {
          app.patientId = null;
          app.reason = 'Reserved';
          app.notes = '';
          app.diagnosis = '';
        }
        return app;
      });
    }

    res.json(appsWithBilling);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const cleanTimeSlot = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.split(/\(Limit:/i)[0].trim();
};

const checkSlotCapacity = async (doctorId, date, time, excludeAppointmentId = null) => {
  const User = require('../models/User');
  const doctorObj = await User.findById(doctorId);
  if (!doctorObj) {
    throw new Error('Doctor not found');
  }

  let limit = doctorObj.max_slots || 10;
  const targetTimeClean = cleanTimeSlot(time).toLowerCase();

  if (doctorObj.doctorSlots && doctorObj.doctorSlots.length > 0) {
    const matchingSlot = doctorObj.doctorSlots.find(s => {
      const sClean = cleanTimeSlot(s).toLowerCase();
      return sClean === targetTimeClean;
    });

    if (matchingSlot) {
      const match = matchingSlot.match(/\(Limit:\s*(\d+)\)/i);
      if (match) {
        limit = parseInt(match[1], 10);
      }
    }
  }

  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  const query = {
    doctorId,
    status: { $ne: 'Cancelled' },
    date: { $gte: startOfDay, $lte: endOfDay }
  };
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const appointments = await Appointment.find(query);

  const bookedCount = appointments.filter(app => {
    return cleanTimeSlot(app.time).toLowerCase() === targetTimeClean;
  }).length;

  if (bookedCount >= limit) {
    throw new Error(`This slot is fully booked. Slot limit is ${limit} patients.`);
  }
};

// Create an appointment (scoped to tenant)
router.post('/', async (req, res) => {
  const { patientId, doctorId, date, time, status, reason, notes, diagnosis, regNo } = req.body;
  try {
    const User = require('../models/User');
    const doctorObj = await User.findById(doctorId);
    if (!doctorObj) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Validate slot capacity limit
    if (doctorId && date && time) {
      await checkSlotCapacity(doctorId, date, time);
    }

    const resolvedTenantId = doctorObj.tenantId || req.tenantId;

    // Resolve / provision Patient record in target tenant
    const Patient = require('../models/Patient');
    let targetPatientId = patientId;
    const currentPatient = await Patient.findById(patientId);
    if (currentPatient && currentPatient.tenantId !== resolvedTenantId) {
      let targetPatient = await Patient.findOne({
        contact: currentPatient.contact,
        tenantId: resolvedTenantId
      });
      if (!targetPatient) {
        targetPatient = await Patient.create({
          tenantId: resolvedTenantId,
          name: currentPatient.name,
          age: currentPatient.age,
          gender: currentPatient.gender,
          contact: currentPatient.contact,
          email: currentPatient.email,
          address: currentPatient.address,
          bloodGroup: currentPatient.bloodGroup,
          allergies: currentPatient.allergies,
          currentMedications: currentPatient.currentMedications || '',
          medicalHistory: currentPatient.medicalHistory,
          avatar: currentPatient.avatar
        });

        const Consent = require('../models/Consent');
        await Consent.create({
          tenantId: resolvedTenantId,
          patientId: targetPatient._id,
          purposes: {
            treatment: true,
            insurance: true,
            research: false
          },
          status: 'Active',
          signature: 'Auto-consented during offline appointment booking',
          ipAddress: '127.0.0.1',
          userAgent: 'System Automated Workflow'
        });
      }
      targetPatientId = targetPatient._id;
    }

    const appointmentSource = req.body.source || (req.user && req.user.role === 'patient' ? 'Online' : 'Walk-In');

    const appointment = await Appointment.create({
      tenantId: resolvedTenantId,
      patientId: targetPatientId,
      doctorId: doctorId || null,
      date,
      time,
      status: status || 'Pending',
      reason,
      notes,
      diagnosis,
      regNo,
      source: appointmentSource
    });

    // Auto-dispatch Lab Request if appointment involves lab tests
    let labRequest = null;
    if (req.body.testName || req.body.appointmentType === 'Lab Test') {
      const LabRequest = require('../models/LabRequest');
      labRequest = await LabRequest.create({
        tenantId: resolvedTenantId,
        appointmentId: appointment._id,
        patientId: targetPatientId,
        doctorId: doctorId && doctorId !== 'null' ? doctorId : null,
        testName: req.body.testName || reason || 'Diagnostic Lab Test',
        notes: notes || '',
        status: 'Pending'
      });
    }

    // Auto-create Billing invoice/receipt if amount or payment details are provided
    let bill = null;
    if (req.body.amount !== undefined || req.body.paymentMode || req.body.testName) {
      const Billing = require('../models/Billing');
      const amount = Number(req.body.amount) || 0;
      const tax = Number(req.body.tax) || 0;
      const discount = Number(req.body.discount) || 0;
      const total = Math.max(0, amount + tax - discount);
      bill = await Billing.create({
        tenantId: resolvedTenantId,
        appointmentId: appointment._id,
        patientId: targetPatientId,
        amount,
        tax,
        discount,
        total,
        paymentMode: req.body.paymentMode || 'Cash',
        status: req.body.paymentStatus || 'Paid',
        items: req.body.items || [{ description: req.body.testName || reason || 'Lab Test Fee', amount }]
      });
    }

    const io = req.app.get("io");
    if (io) {
      const tenantKey = String(resolvedTenantId).trim().toLowerCase();
      io.to(tenantKey).emit("data_changed", { type: "appointments" });
      if (labRequest) {
        io.to(tenantKey).emit("data_changed", { type: "labs" });
      }
      if (bill) {
        io.to(tenantKey).emit("data_changed", { type: "billing" });
      }
    }

    const appObj = appointment.toObject();
    appObj.labRequest = labRequest;
    appObj.bill = bill;

    res.status(201).json(appObj);
  } catch (error) {
    console.error("Create Appointment Error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update appointment status or add notes/diagnosis (scoped to tenant)
router.put('/:id', async (req, res) => {
  const { patientId, doctorId, date, time, status, reason, notes, diagnosis } = req.body;
  try {
    const currentAppointment = await Appointment.findById(req.params.id);
    if (!currentAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const checkDoctorId = doctorId || currentAppointment.doctorId;
    const checkDate = date || currentAppointment.date;
    const checkTime = time || currentAppointment.time;
    const checkStatus = status || currentAppointment.status;

    const isCancelled = checkStatus === 'Cancelled';
    const hasDetailsChanged = 
      String(checkDoctorId) !== String(currentAppointment.doctorId) ||
      new Date(checkDate).toDateString() !== new Date(currentAppointment.date).toDateString() ||
      cleanTimeSlot(checkTime).toLowerCase() !== cleanTimeSlot(currentAppointment.time).toLowerCase() ||
      (currentAppointment.status === 'Cancelled' && !isCancelled);

    if (!isCancelled && hasDetailsChanged) {
      await checkSlotCapacity(checkDoctorId, checkDate, checkTime, req.params.id);
    }

    const updateObj = {};
    if (patientId !== undefined) updateObj.patientId = patientId;
    if (doctorId !== undefined) updateObj.doctorId = doctorId;
    if (date !== undefined) updateObj.date = date;
    if (time !== undefined) updateObj.time = time;
    if (status !== undefined) updateObj.status = status;
    if (reason !== undefined) updateObj.reason = reason;
    if (notes !== undefined) updateObj.notes = notes;
    if (diagnosis !== undefined) updateObj.diagnosis = diagnosis;

    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id }, 
      updateObj, 
      { returnDocument: 'after' }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    const io = req.app.get("io");
    if (io) {
      io.to(String(req.tenantId).trim().toLowerCase()).emit("data_changed", { type: "appointments" });
      if (appointment.tenantId && appointment.tenantId !== req.tenantId) {
        io.to(String(appointment.tenantId).trim().toLowerCase()).emit("data_changed", { type: "appointments" });
      }
    }
    res.json(appointment);
  } catch (error) {
    console.error("PUT Appointment Error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete an appointment (scoped to tenant)
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({ _id: req.params.id });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    const io = req.app.get("io");
    if (io) {
      io.to(String(req.tenantId).trim().toLowerCase()).emit("data_changed", { type: "appointments" });
      if (appointment.tenantId && appointment.tenantId !== req.tenantId) {
        io.to(String(appointment.tenantId).trim().toLowerCase()).emit("data_changed", { type: "appointments" });
      }
    }
    res.json({ message: 'Appointment deleted' });
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Approve an appointment request, dynamically generate bill (with 1-time Reg fee if applicable), and request payment
router.put('/:id/approve', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId')
      .populate('doctorId');
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const User = require('../models/User');
    const Billing = require('../models/Billing');
    const doctorObj = appointment.doctorId;

    // 1. Check if patient has already been charged the One-Time Registration Fee in this tenant
    const existingRegBill = await Billing.findOne({
      tenantId: appointment.tenantId,
      patientId: appointment.patientId?._id || appointment.patientId,
      'items.description': { $regex: /Registration Fee/i }
    });

    const billItems = [];
    let totalAmount = 0;

    // If first time registering / no previous registration fee charged, add 1-Time OPD Reg Fee
    if (!existingRegBill) {
      const regFee = 50; // Standard 1-time OPD registration charge
      billItems.push({
        description: 'One-Time OPD Registration Fee',
        amount: regFee
      });
      totalAmount += regFee;
    }

    const consultFee = (doctorObj && doctorObj.consultationFee !== undefined && doctorObj.consultationFee !== null && !isNaN(doctorObj.consultationFee)) ? Number(doctorObj.consultationFee) : 0;
    billItems.push({
      description: `Doctor Consultation Fee (${doctorObj?.name || 'Doctor'})`,
      amount: consultFee
    });
    totalAmount += consultFee;

    // Create or update existing Unpaid Billing invoice
    let bill = await Billing.findOne({ appointmentId: appointment._id });
    if (!bill) {
      bill = await Billing.create({
        tenantId: appointment.tenantId,
        patientId: appointment.patientId?._id || appointment.patientId,
        appointmentId: appointment._id,
        items: billItems,
        totalAmount,
        status: 'Unpaid',
        paymentMethod: 'Online'
      });
    } else {
      bill.items = billItems;
      bill.totalAmount = totalAmount;
      bill.status = 'Unpaid';
      await bill.save();
    }

    appointment.status = 'Approved';
    appointment.paymentStatus = 'Pending';
    await appointment.save();

    const io = req.app.get("io");
    if (io) {
      io.to(String(appointment.tenantId).trim().toLowerCase()).emit("data_changed", { type: "appointments" });
      io.to(String(appointment.tenantId).trim().toLowerCase()).emit("data_changed", { type: "billing" });
    }

    res.json({
      success: true,
      message: 'Appointment approved and invoice created with payment request.',
      appointment,
      bill
    });
  } catch (error) {
    console.error("Approve appointment error:", error);
    res.status(500).json({ error: error.message || 'Failed to approve appointment' });
  }
});

// Reject an appointment request
router.put('/:id/reject', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    appointment.status = 'Cancelled';
    await appointment.save();

    const io = req.app.get("io");
    if (io) {
      io.to(String(appointment.tenantId).trim().toLowerCase()).emit("data_changed", { type: "appointments" });
    }

    res.json({
      success: true,
      message: 'Appointment request has been rejected.',
      appointment
    });
  } catch (error) {
    console.error("Reject appointment error:", error);
    res.status(500).json({ error: error.message || 'Failed to reject appointment' });
  }
});

// Pay & Confirm appointment from Patient Portal
router.post('/:id/pay', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const Billing = require('../models/Billing');
    const paymentMethod = req.body.paymentMethod || 'Online (UPI/Card)';
    
    // Find or create bill
    let bill = await Billing.findOne({ appointmentId: appointment._id });
    if (bill) {
      bill.status = 'Paid';
      bill.paymentMethod = paymentMethod;
      await bill.save();
    }

    appointment.status = 'Confirmed';
    appointment.paymentStatus = 'Paid';
    await appointment.save();

    const io = req.app.get("io");
    if (io) {
      io.to(String(appointment.tenantId).trim().toLowerCase()).emit("data_changed", { type: "appointments" });
      io.to(String(appointment.tenantId).trim().toLowerCase()).emit("data_changed", { type: "billing" });
    }

    res.json({
      success: true,
      message: 'Payment completed successfully! Appointment is now confirmed.',
      appointment,
      bill
    });
  } catch (error) {
    console.error("Pay appointment error:", error);
    res.status(500).json({ error: error.message || 'Payment processing failed' });
  }
});

module.exports = router;
