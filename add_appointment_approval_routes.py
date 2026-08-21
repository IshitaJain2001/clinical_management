import sys

routes_file = r'D:\rizwan\backend\routes\appointmentRoutes.js'
with open(routes_file, 'r', encoding='utf-8') as f:
    text = f.read()

approval_routes = """
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

    const consultFee = Number(doctorObj?.consultationFee) || 500;
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
"""

if "router.put('/:id/approve'" not in text:
    text = text.replace("module.exports = router;", approval_routes + "\nmodule.exports = router;")
    with open(routes_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Added /approve, /reject, and /pay routes to appointmentRoutes.js")
else:
    print("Routes already present in appointmentRoutes.js")
