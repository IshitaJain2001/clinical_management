const express = require('express');
const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(verifyToken);

// Get all Purchase Orders (scoped to tenant)
router.get('/', async (req, res) => {
  try {
    const pos = await PurchaseOrder.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(pos);
  } catch (error) {
    console.error("Get purchase orders error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new Purchase Order (scoped to tenant)
router.post('/', async (req, res) => {
  const { poId, vendorId, vendorName, items, totalAmount, requestedBy, status, expectedDelivery } = req.body;
  try {
    const po = await PurchaseOrder.create({
      tenantId: req.tenantId,
      poId,
      vendorId,
      vendorName,
      items,
      totalAmount,
      requestedBy,
      status: status || 'Draft',
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null
    });

    if (po.status === 'Pending' || po.status === 'Pending Approval') {
      const Approval = require('../models/Approval');
      await Approval.create({
        tenantId: req.tenantId,
        type: 'purchase_order_approval',
        staffId: req.user.staff_id || req.user.id || 'system',
        requesterName: requestedBy || req.user.name || 'Pharmacist',
        requesterRole: req.user.role || 'pharmacist',
        details: {
          poId: po._id,
          poNumber: po.poId,
          vendorId: po.vendorId,
          vendorName: po.vendorName,
          items: po.items,
          totalAmount: po.totalAmount
        },
        comment: `Purchase Order approval request for ${po.poId}`
      });
    }

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "purchase_orders" });
      if (po.status === 'Pending' || po.status === 'Pending Approval') {
        io.to(req.tenantId).emit("data_changed", { type: "approvals" });
      }
    }
    res.status(201).json(po);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Edit / Update a Purchase Order (scoped to tenant - used by Admin)
router.put('/:id', async (req, res) => {
  const { items, totalAmount, paidAmount, vendorId, vendorName, status, expectedDelivery } = req.body;
  try {
    const updateData = {};
    if (items !== undefined) updateData.items = items;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
    if (vendorId !== undefined) updateData.vendorId = vendorId;
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (status !== undefined) updateData.status = status;
    if (expectedDelivery !== undefined) updateData.expectedDelivery = expectedDelivery ? new Date(expectedDelivery) : null;

    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      updateData,
      { returnDocument: 'after' }
    );
    
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    // Also update vendor purchase history if approved
    if (status === 'Approved') {
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

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "purchase_orders" });
      if (status === 'Approved') {
        io.to(req.tenantId).emit("data_changed", { type: "vendors" });
      }
    }
    res.json(po);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a Purchase Order (scoped to tenant)
router.delete('/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "purchase_orders" });
    }
    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve Purchase Order
router.put('/:id/approve', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status: 'Approved' },
      { returnDocument: 'after' }
    );
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    // Push into vendor purchase history
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

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "purchase_orders" });
      io.to(req.tenantId).emit("data_changed", { type: "vendors" });
    }
    res.json(po);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
