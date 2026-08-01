const express = require('express');
const Billing = require('../models/Billing');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();
const DiscountSetting = require('../models/DiscountSetting');

router.use(verifyToken);

// Get discount setting (scoped to tenant)
router.get('/discount-setting', async (req, res) => {
  try {
    let setting = await DiscountSetting.findOne({ tenantId: req.tenantId });
    if (!setting) {
      setting = await DiscountSetting.create({
        tenantId: req.tenantId,
        allowedDiscountPercent: 10
      });
    }
    res.json(setting);
  } catch (error) {
    console.error("Get discount setting error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update discount setting (scoped to tenant, admin/hr only)
router.post('/discount-setting', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({ error: "Only Admin or HR can modify discount settings" });
  }
  const { allowedDiscountPercent } = req.body;
  if (allowedDiscountPercent === undefined || allowedDiscountPercent < 0 || allowedDiscountPercent > 100) {
    return res.status(400).json({ error: "Invalid allowed discount percentage" });
  }
  try {
    const setting = await DiscountSetting.findOneAndUpdate(
      { tenantId: req.tenantId },
      { allowedDiscountPercent: Number(allowedDiscountPercent) },
      { upsert: true, returnDocument: 'after' }
    );
    const io = req.app.get("io");
    if (io) {
      io.to(req.tenantId).emit("data_changed", { type: "discount_setting" });
    }
    res.json(setting);
  } catch (error) {
    console.error("Update discount setting error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bills (scoped to tenant)
router.get('/', async (req, res) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.query.patientId) query.patientId = req.query.patientId;
    if (req.query.appointmentId) query.appointmentId = req.query.appointmentId;

    const bills = await Billing.find(query)
      .populate('patientId', 'name contact')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create bill (scoped to tenant)
router.post('/', async (req, res) => {
  const { patientId, appointmentId, items, totalAmount, status, paymentMethod } = req.body;
  try {
    let resolvedTenantId = req.tenantId;
    let resolvedPatientId = patientId;

    if (appointmentId) {
      const Appointment = require('../models/Appointment');
      const apptObj = await Appointment.findById(appointmentId);
      if (apptObj) {
        resolvedTenantId = apptObj.tenantId;
        resolvedPatientId = apptObj.patientId;
      }
    }

    const bill = await Billing.create({
      tenantId: resolvedTenantId,
      patientId: resolvedPatientId,
      appointmentId,
      items,
      totalAmount,
      status: status || 'Unpaid',
      paymentMethod
    });

    const io = req.app.get("io");
    if (io) {
      io.to(req.tenantId).emit("data_changed", { type: "billing" });
      if (resolvedTenantId !== req.tenantId) {
        io.to(resolvedTenantId).emit("data_changed", { type: "billing" });
      }
    }
    res.status(201).json(bill);
  } catch (error) {
    console.error("Create Billing Record Error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update bill (scoped to tenant)
router.put('/:id', async (req, res) => {
  const { patientId, appointmentId, items, totalAmount, status, paymentMethod, discountPercent, discountAmount, originalAmount, discountReason } = req.body;
  try {
    const updateObj = {};
    if (patientId !== undefined) updateObj.patientId = patientId;
    if (appointmentId !== undefined) updateObj.appointmentId = appointmentId;
    if (items !== undefined) updateObj.items = items;
    if (totalAmount !== undefined) updateObj.totalAmount = totalAmount;
    if (status !== undefined) updateObj.status = status;
    if (paymentMethod !== undefined) updateObj.paymentMethod = paymentMethod;
    if (discountPercent !== undefined) updateObj.discountPercent = discountPercent;
    if (discountAmount !== undefined) updateObj.discountAmount = discountAmount;
    if (originalAmount !== undefined) updateObj.originalAmount = originalAmount;
    if (discountReason !== undefined) updateObj.discountReason = discountReason;

    const bill = await Billing.findOneAndUpdate(
      { _id: req.params.id }, 
      updateObj, 
      { returnDocument: 'after' }
    ).populate('patientId', 'name contact');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // If discount was applied, create Audit Log
    if (discountPercent !== undefined && discountPercent > 0) {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        tenantId: req.tenantId,
        actor: req.user.staff_id || req.user.id || 'system',
        actorName: req.user.name || '',
        actorRole: req.user.role || 'receptionist',
        action: 'discount_applied',
        target: String(bill._id),
        metadata: {
          discountPercent,
          discountAmount,
          originalAmount,
          discountReason,
          patientName: bill.patientId?.name || 'Unknown Patient'
        }
      }).catch(err => console.error("Audit log error for discount:", err));
    }

    const io = req.app.get("io");
    if (io) {
      io.to(req.tenantId).emit("data_changed", { type: "billing" });
      if (bill.tenantId && bill.tenantId !== req.tenantId) {
        io.to(bill.tenantId).emit("data_changed", { type: "billing" });
      }
    }
    res.json(bill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
