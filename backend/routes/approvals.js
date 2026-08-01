const express = require('express');
const Approval = require('../models/Approval');
const AuditLog = require('../models/AuditLog');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const router = express.Router();

// GET /api/approvals — list approvals for current tenant
// Query params: status (pending|approved|denied), type, limit
router.get('/', verifyToken, tenantMiddleware, async (req, res) => {
  try {
    const filter = { tenantId: req.tenantId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const approvals = await Approval.find(filter)
      .sort({ requestedAt: -1 })
      .limit(limit)
      .lean();
    res.json(approvals);
  } catch (err) {
    console.error("Approvals error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/approvals — create a new approval request (any authenticated user)
router.post('/', verifyToken, tenantMiddleware, async (req, res) => {
  try {
    const { type, staffId, requesterName, requesterRole, details, comment } = req.body;
    if (!type || !staffId || !requesterName) {
      return res.status(400).json({ error: 'type, staffId, and requesterName are required' });
    }
    const approval = await Approval.create({
      tenantId: req.tenantId,
      type,
      staffId,
      requesterName,
      requesterRole: requesterRole || req.user.role || '',
      details: details || {},
      comment: comment || ''
    });
    // Audit trail
    await AuditLog.create({
      tenantId: req.tenantId,
      actor: staffId,
      actorName: requesterName,
      actorRole: requesterRole || req.user.role || '',
      action: 'approval_requested',
      target: approval._id.toString(),
      metadata: { type, comment }
    });
    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "approvals" });
      if (type === 'Indent' || type === 'indent') {
        io.to(req.tenantId).emit("data_changed", { type: "indents" });
      }
    }
    res.status(201).json(approval);
  } catch (err) {
    console.error("Approvals error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/approvals/:id — approve or deny (admin only)
router.patch('/:id', verifyToken, isAdmin, tenantMiddleware, async (req, res) => {
  try {
    const { status, comment } = req.body;
    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or denied' });
    }
    const approval = await Approval.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        status,
        comment: comment || '',
        resolvedAt: new Date(),
        resolvedBy: req.user.staff_id || req.user.id
      },
      { returnDocument: 'after' }
    );
    if (!approval) return res.status(404).json({ error: 'Approval not found' });

    // Side effects based on type and status
    if (status === 'approved') {
      if (approval.type === 'receptionist_indent' || approval.type === 'Indent' || approval.type === 'indent') {
        const Indent = require('../models/Indent');
        const Medicine = require('../models/Medicine');
        const indentId = approval.details.indentId;
        if (indentId) {
          const indent = await Indent.findOneAndUpdate(
            { _id: indentId, tenantId: req.tenantId },
            { status: 'Approved' },
            { returnDocument: 'after' }
          );
          if (indent && indent.items) {
            for (const item of indent.items) {
              const qty = Number(item.requiredQty) || 0;
              if (qty <= 0) continue;
              const med = await Medicine.findOne({ tenantId: req.tenantId, name: item.name });
              if (med) {
                med.stock = Math.max(0, med.stock - qty);
                if (med.stock === 0) med.status = 'Out of Stock';
                else if (med.stock <= 20) med.status = 'Low Stock';
                else med.status = 'In Stock';
                await med.save();
              }
            }
          }
        }
      } else if (approval.type === 'vendor_onboarding') {
        const Vendor = require('../models/Vendor');
        const vendorId = approval.details.vendorId;
        if (vendorId) {
          await Vendor.findOneAndUpdate(
            { _id: vendorId, tenantId: req.tenantId },
            { status: 'Active' }
          );
        }
      } else if (approval.type === 'item_price_update') {
        const Vendor = require('../models/Vendor');
        const vendorId = approval.details.vendorId;
        const itemsToUpdate = approval.details.items;
        if (vendorId && Array.isArray(itemsToUpdate)) {
          const vendor = await Vendor.findOne({ _id: vendorId, tenantId: req.tenantId });
          if (vendor) {
            for (const item of itemsToUpdate) {
              const existingIdx = vendor.medicines.findIndex(m => m.sku === item.sku);
              if (existingIdx !== -1) {
                vendor.medicines[existingIdx].price = Number(item.proposedPrice);
              } else {
                vendor.medicines.push({
                  name: item.name,
                  sku: item.sku,
                  price: Number(item.proposedPrice),
                  available: true
                });
              }
            }
            await vendor.save();
          }
        }
      } else if (approval.type === 'purchase_order_approval') {
        const PurchaseOrder = require('../models/PurchaseOrder');
        const Vendor = require('../models/Vendor');
        const poId = approval.details.poId || approval.details.id;
        if (poId) {
          const po = await PurchaseOrder.findOneAndUpdate(
            { _id: poId, tenantId: req.tenantId },
            { status: 'Approved' },
            { returnDocument: 'after' }
          );
          if (po) {
            await Vendor.findOneAndUpdate(
              { _id: po.vendorId, tenantId: req.tenantId },
              {
                $push: {
                  purchaseHistory: {
                    poId: po.poId,
                    date: new Date(),
                    amount: po.totalAmount,
                    status: 'Approved'
                  }
                }
              }
            );
          }
        }
      }
    } else if (status === 'denied') {
      if (approval.type === 'receptionist_indent' || approval.type === 'Indent' || approval.type === 'indent') {
        const Indent = require('../models/Indent');
        const indentId = approval.details.indentId;
        if (indentId) {
          await Indent.findOneAndUpdate(
            { _id: indentId, tenantId: req.tenantId },
            { status: 'Rejected' }
          );
        }
      } else if (approval.type === 'vendor_onboarding') {
        const Vendor = require('../models/Vendor');
        const vendorId = approval.details.vendorId;
        if (vendorId) {
          await Vendor.findOneAndUpdate(
            { _id: vendorId, tenantId: req.tenantId },
            { status: 'Proposed/Rejected' }
          );
        }
      } else if (approval.type === 'purchase_order_approval') {
        const PurchaseOrder = require('../models/PurchaseOrder');
        const poId = approval.details.poId || approval.details.id;
        if (poId) {
          await PurchaseOrder.findOneAndUpdate(
            { _id: poId, tenantId: req.tenantId },
            { status: 'Rejected' }
          );
        }
      }
    }

    // Audit trail
    await AuditLog.create({
      tenantId: req.tenantId,
      actor: req.user.staff_id || req.user.id,
      actorName: req.user.name || '',
      actorRole: req.user.role || 'admin',
      action: `approval_${status}`,
      target: approval._id.toString(),
      metadata: { type: approval.type, comment }
    });

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "approvals" });
      if (approval.type === 'Indent' || approval.type === 'indent') {
        io.to(req.tenantId).emit("data_changed", { type: "indents" });
      }
    }
    res.json(approval);
  } catch (err) {
    console.error("Approvals error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/approvals/:id — admin only
router.delete('/:id', verifyToken, isAdmin, tenantMiddleware, async (req, res) => {
  try {
    const approval = await Approval.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "approvals" });
      if (approval && (approval.type === 'Indent' || approval.type === 'indent')) {
        io.to(req.tenantId).emit("data_changed", { type: "indents" });
      }
    }
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    console.error("Approvals error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
