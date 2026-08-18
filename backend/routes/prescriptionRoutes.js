const express = require("express");
const Prescription = require("../models/Prescription");
const Medicine = require("../models/Medicine");
const AuditLog = require("../models/AuditLog");
const Appointment = require("../models/Appointment");
const LabRequest = require("../models/LabRequest");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(verifyToken);

// Get all prescriptions (filter by status or patientId, scoped to tenant)
router.get("/", async (req, res) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.patientId) query.patientId = req.query.patientId;

    // Projection: only fields the pharmacy queue / doctor history actually need
    const prescriptions = await Prescription.find(query)
      .select(
        "patientId doctorId items status createdAt updatedAt appointmentId",
      )
      .populate("patientId", "name age contact")
      .populate("doctorId", "name specialty department designation staff_id")
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit, 10) || 200)
      .lean();
    res.json(prescriptions);
  } catch (error) {
    console.error("Get prescriptions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a prescription (scoped to tenant) — with parallel stock reservation
router.post("/", async (req, res) => {
  const { patientId, doctorId, items, status, appointmentId } = req.body;
  try {
    const prescription = await Prescription.create({
      tenantId: req.tenantId,
      patientId,
      doctorId,
      items,
      status,
      appointmentId
    });

    // Pre-deduct stock in parallel based on the actual prescribed quantity
    if (Array.isArray(prescription.items) && prescription.items.length > 0) {
      const stockUpdates = prescription.items
        .filter((item) => item && item.medicine)
        .map(async (item) => {
          const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
          try {
            // Try exact name match first
            let med = await Medicine.findOne({
              name: item.medicine,
              tenantId: req.tenantId,
            });
            if (!med) {
              // Fallback to regex match of all words in the input name
              const words = String(item.medicine).split(/\s+/).filter(Boolean);
              if (words.length > 0) {
                const conditions = words.map(w => ({
                  name: { $regex: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                }));
                med = await Medicine.findOne({
                  $and: conditions,
                  tenantId: req.tenantId,
                });
              }
            }
            if (med) {
              med.stock = Math.max(0, med.stock - qty);
              if (med.stock === 0) med.status = "Out of Stock";
              else if (med.stock <= 20) med.status = "Low Stock";
              else med.status = "In Stock";
              await med.save();
            }
          } catch (e) {
            // best-effort per item
          }
        });
      // Don't block the response on stock updates
      Promise.all(stockUpdates).catch(() => {});
    }

    // Fire-and-forget audit log
    AuditLog.create({
      tenantId: req.tenantId,
      actor: req.user.staff_id || req.user.id || "system",
      actorName: req.user.name || "",
      actorRole: req.user.role || "",
      action: "prescription_created",
      target: prescription._id.toString(),
      metadata: {
        patientId: prescription.patientId,
        itemCount: prescription.items?.length || 0,
      },
    }).catch(() => {});

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "prescriptions" });
      io.to(req.tenantId).emit("data_changed", { type: "medicines" });
    }
    res.status(201).json(prescription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update status or edit prescription details (scoped to tenant)
router.put("/:id", async (req, res) => {
  const { items, status, appointmentId, labs, diagnosis, notes } = req.body;
  try {
    const rxId = req.params.id;
    const previous = await Prescription.findOne({
      _id: rxId,
      tenantId: req.tenantId,
    })
      .populate("patientId", "name")
      .lean();
    if (!previous)
      return res.status(404).json({ error: "Prescription not found" });

    const updateObj = {};
    if (items !== undefined) updateObj.items = items;
    if (status !== undefined) updateObj.status = status;
    if (appointmentId !== undefined) updateObj.appointmentId = appointmentId;

    const prescription = await Prescription.findOneAndUpdate(
      { _id: rxId, tenantId: req.tenantId },
      updateObj,
      { returnDocument: "after" }
    ).populate("patientId", "name");
    let pharmacistChanged = false;
    let labTechChanged = false;
    const diffDetails = [];

    // 1. Compare medicines (pharmacist/doctor changes)
    if (items !== undefined && previous.items) {
      const prevMap = new Map(previous.items.map(i => [i.medicine, i]));
      const newMap = new Map(items.map(i => [i.medicine, i]));

      for (const [name, newItem] of newMap) {
        if (!prevMap.has(name)) {
          diffDetails.push(`Added medicine: ${name} (${newItem.dosage}, ${newItem.duration})`);
          pharmacistChanged = true;
        } else {
          const oldItem = prevMap.get(name);
          const changes = [];
          if (oldItem.dosage !== newItem.dosage) changes.push(`dose (${oldItem.dosage} -> ${newItem.dosage})`);
          if (oldItem.duration !== newItem.duration) changes.push(`duration (${oldItem.duration} -> ${newItem.duration})`);
          if (oldItem.instructions !== newItem.instructions) changes.push(`instructions (${oldItem.instructions} -> ${newItem.instructions})`);
          if (changes.length > 0) {
            diffDetails.push(`Modified ${name}: ${changes.join(', ')}`);
            pharmacistChanged = true;
          }
        }
      }

      for (const [name, oldItem] of prevMap) {
        if (!newMap.has(name)) {
          diffDetails.push(`Removed medicine: ${name}`);
          pharmacistChanged = true;
        }
      }
    }

    // 2. Manage Labs & Compare (lab technician changes)
    const activeAppId = appointmentId || previous.appointmentId;
    if (labs !== undefined && activeAppId) {
      const existingLabs = await LabRequest.find({ appointmentId: activeAppId, tenantId: req.tenantId });
      const existingNames = existingLabs.map(l => l.testName.trim().toLowerCase());
      const newNames = labs.map(l => l.trim().toLowerCase());

      const toDelete = existingLabs.filter(l => !newNames.includes(l.testName.trim().toLowerCase()));
      if (toDelete.length > 0) {
        await LabRequest.deleteMany({ _id: { $in: toDelete.map(l => l._id) } });
        diffDetails.push(`Removed lab tests: ${toDelete.map(l => l.testName).join(', ')}`);
        labTechChanged = true;
      }

      const toCreate = labs.filter(name => !existingNames.includes(name.trim().toLowerCase()));
      for (const test of toCreate) {
        await LabRequest.create({
          tenantId: req.tenantId,
          appointmentId: activeAppId,
          patientId: previous.patientId?._id || previous.patientId,
          doctorId: req.user.id,
          testName: test.trim(),
          notes: 'Requested from Prescription EMR (Edited)'
        });
        labTechChanged = true;
      }
      if (toCreate.length > 0) {
        diffDetails.push(`Added lab tests: ${toCreate.join(', ')}`);
      }
    }

    // 3. Update Appointment diagnosis/notes if provided
    if (activeAppId && (diagnosis !== undefined || notes !== undefined)) {
      const previousApp = await Appointment.findById(activeAppId).lean();
      if (previousApp) {
        if (diagnosis !== undefined && diagnosis !== previousApp.diagnosis) {
          diffDetails.push(`Updated diagnosis: "${previousApp.diagnosis || 'None'}" -> "${diagnosis}"`);
        }
        if (notes !== undefined && notes !== previousApp.notes) {
          diffDetails.push(`Updated symptoms/subjective notes`);
        }
      }
      const appUpdate = {};
      if (diagnosis !== undefined) appUpdate.diagnosis = diagnosis;
      if (notes !== undefined) appUpdate.notes = notes;
      await Appointment.findByIdAndUpdate(activeAppId, appUpdate);
    }

    // Restore stock if transitioning to Cancelled
    if (status === "Cancelled" && previous.status !== "Cancelled") {
      const rxItems = prescription.items || previous.items || [];
      if (Array.isArray(rxItems) && rxItems.length > 0) {
        const stockUpdates = rxItems
          .filter((item) => item && item.medicine)
          .map(async (item) => {
            const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
            try {
              let med = await Medicine.findOne({
                name: item.medicine,
                tenantId: req.tenantId,
              });
              if (!med) {
                const words = String(item.medicine).split(/\s+/).filter(Boolean);
                if (words.length > 0) {
                  const conditions = words.map(w => ({
                    name: { $regex: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                  }));
                  med = await Medicine.findOne({
                    $and: conditions,
                    tenantId: req.tenantId,
                  });
                }
              }
              if (med) {
                med.stock = med.stock + qty;
                if (med.stock === 0) med.status = "Out of Stock";
                else if (med.stock <= 20) med.status = "Low Stock";
                else med.status = "In Stock";
                await med.save();
              }
            } catch (e) {
              // best-effort per item
            }
          });
        Promise.all(stockUpdates).catch(() => {});
      }
    }

    // Audit log for edits or status transitions
    AuditLog.create({
      tenantId: req.tenantId,
      actor: req.user.staff_id || req.user.id || "system",
      actorName: req.user.name || "",
      actorRole: req.user.role || "",
      action: pharmacistChanged || labTechChanged ? "prescription_edited" : "prescription_status_changed",
      target: prescription._id.toString(),
      metadata: { 
        pharmacistChanged,
        labTechChanged,
        from: previous.status, 
        to: status || prescription.status,
        diff: diffDetails.length > 0 ? diffDetails : ["General updates"]
      },
    }).catch(() => {});

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "prescriptions" });
      io.to(req.tenantId).emit("data_changed", { type: "medicines" });
      if (labTechChanged) {
        io.to(req.tenantId).emit("data_changed", { type: "labs" });
      }

      // If changes are related to pharmacist or lab technician, emit specific notification event
      if (pharmacistChanged || labTechChanged) {
        const patientName = prescription.patientId?.name || "Patient";
        io.to(req.tenantId).emit("data_changed", {
          type: "prescription_updated",
          message: `Prescription for Patient "${patientName}" has been edited by Dr. ${req.user.name || 'Sarah'}`,
          changes: {
            pharmacist: pharmacistChanged,
            labTech: labTechChanged
          }
        });
      }
    }
    res.json(prescription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
