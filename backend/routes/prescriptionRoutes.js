const express = require("express");
const Prescription = require("../models/Prescription");
const Medicine = require("../models/Medicine");
const AuditLog = require("../models/AuditLog");
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
      .populate("doctorId", "name")
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

// Update status (e.g. Dispensed) — stock is pre-deducted at prescription create time
router.put("/:id", async (req, res) => {
  const { items, status, appointmentId } = req.body;
  try {
    const rxId = req.params.id;
    const previous = await Prescription.findOne({
      _id: rxId,
      tenantId: req.tenantId,
    })
      .select("status items")
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
      { returnDocument: "after" },
    );

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

    // Audit log for status transitions
    if (status && previous.status !== status) {
      AuditLog.create({
        tenantId: req.tenantId,
        actor: req.user.staff_id || req.user.id || "system",
        actorName: req.user.name || "",
        actorRole: req.user.role || "",
        action: "prescription_status_changed",
        target: prescription._id.toString(),
        metadata: { from: previous.status, to: status },
      }).catch(() => {});
    }

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "prescriptions" });
      io.to(req.tenantId).emit("data_changed", { type: "medicines" });
    }
    res.json(prescription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
