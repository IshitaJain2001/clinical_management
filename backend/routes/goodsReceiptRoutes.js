const express = require('express');
const GoodsReceipt = require('../models/GoodsReceipt');
const Medicine = require('../models/Medicine');
const PurchaseOrder = require('../models/PurchaseOrder');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(verifyToken);

// Get all GRNs (scoped to tenant)
router.get('/', async (req, res) => {
  try {
    const grns = await GoodsReceipt.find({ tenantId: req.tenantId }).sort({ receivedDate: -1 });
    res.json(grns);
  } catch (error) {
    console.error("Get GRNs error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new GRN and update stock automatically (scoped to tenant)
router.post('/', async (req, res) => {
  const { grnId, poId, poNumber, vendorId, vendorName, items, invoiceUrl, notes, status } = req.body;
  try {
    // 1. Create the GRN record
    const grn = await GoodsReceipt.create({
      tenantId: req.tenantId,
      grnId,
      poId: poId || null,
      poNumber: poNumber || '',
      vendorId,
      vendorName,
      status: status || 'Verified/Completed',
      items: (items || []).map(item => ({
        name: item.name,
        sku: item.sku,
        qtyOrdered: Number(item.qtyOrdered) || 0,
        qtyReceived: Number(item.qtyReceived) || 0,
        price: Number(item.price) || 0,
        gst: Number(item.gst) || 0,
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        mfgDate: item.mfgDate ? new Date(item.mfgDate) : null
      })),
      invoiceUrl: invoiceUrl || '',
      notes: notes || '',
      receivedBy: req.user ? req.user.name : 'Pharmacy Staff',
      receivedDate: new Date()
    });

    // If poId is provided, perform variance checks to update PO status
    if (poId) {
      const po = await PurchaseOrder.findOne({ _id: poId, tenantId: req.tenantId });
      if (po) {
        let allMatched = true;
        for (const poItem of po.items) {
          const receivedItem = (items || []).find(i => i.sku === poItem.sku);
          const receivedQty = receivedItem ? (Number(receivedItem.qtyReceived) || 0) : 0;
          if (receivedQty < poItem.requiredQty) {
            allMatched = false;
          }
        }
        po.status = allMatched ? 'Fully Received' : 'Partially Received';
        await po.save();
      }
    }

    // 2. Loop through each item to update inventory/stock
    for (const item of (items || [])) {
      const quantity = Number(item.qtyReceived) || 0;
      if (quantity <= 0) continue;

      const medicine = await Medicine.findOne({ sku: item.sku, tenantId: req.tenantId });
      
      if (medicine) {
        const newStock = medicine.stock + quantity;
        medicine.stock = newStock;
        if (item.expiryDate) {
          medicine.expiry = new Date(item.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' });
        }
        
        if (newStock === 0) {
          medicine.status = 'Out of Stock';
        } else if (newStock <= 20) {
          medicine.status = 'Low Stock';
        } else {
          medicine.status = 'In Stock';
        }
        await medicine.save();
      } else {
        let stockStatus = 'In Stock';
        if (quantity === 0) {
          stockStatus = 'Out of Stock';
        } else if (quantity <= 20) {
          stockStatus = 'Low Stock';
        }

        await Medicine.create({
          tenantId: req.tenantId,
          name: item.name,
          sku: item.sku,
          stock: quantity,
          unit: item.unit || 'Strip',
          mrp: Number(item.price) * 1.25,
          category: item.category || 'General',
          status: stockStatus,
          expiry: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' }) : '--'
        });
      }
    }

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "goods_receipts" });
      io.to(req.tenantId).emit("data_changed", { type: "medicines" });
      io.to(req.tenantId).emit("data_changed", { type: "purchase_orders" });
    }

    res.status(201).json(grn);
  } catch (error) {
    console.error("Create GRN error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update an existing GRN and update stock/PO variance (scoped to tenant)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { poId, poNumber, vendorId, vendorName, items, invoiceUrl, notes, status } = req.body;
  try {
    const oldGrn = await GoodsReceipt.findOne({ _id: id, tenantId: req.tenantId });
    if (!oldGrn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    // 1. If old status was verified/completed, revert stock addition
    if (oldGrn.status === 'Verified/Completed') {
      for (const item of oldGrn.items) {
        const quantity = Number(item.qtyReceived) || 0;
        if (quantity <= 0) continue;

        const medicine = await Medicine.findOne({ sku: item.sku, tenantId: req.tenantId });
        if (medicine) {
          medicine.stock = Math.max(0, medicine.stock - quantity);
          if (medicine.stock === 0) {
            medicine.status = 'Out of Stock';
          } else if (medicine.stock <= 20) {
            medicine.stock = 'Low Stock';
          } else {
            medicine.stock = 'In Stock';
          }
          await medicine.save();
        }
      }
    }

    // 2. Update GRN details
    oldGrn.poId = poId || null;
    oldGrn.poNumber = poNumber || '';
    oldGrn.vendorId = vendorId || oldGrn.vendorId;
    oldGrn.vendorName = vendorName || oldGrn.vendorName;
    oldGrn.status = status || oldGrn.status;
    oldGrn.invoiceUrl = invoiceUrl || oldGrn.invoiceUrl;
    oldGrn.notes = notes || '';
    oldGrn.items = (items || []).map(item => ({
      name: item.name,
      sku: item.sku,
      qtyOrdered: Number(item.qtyOrdered) || 0,
      qtyReceived: Number(item.qtyReceived) || 0,
      price: Number(item.price) || 0,
      gst: Number(item.gst) || 0,
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      mfgDate: item.mfgDate ? new Date(item.mfgDate) : null
    }));
    oldGrn.receivedDate = new Date();
    oldGrn.receivedBy = req.user ? req.user.name : oldGrn.receivedBy;

    const updatedGrn = await oldGrn.save();

    // 3. If new status is Verified/Completed, apply stock addition
    if (updatedGrn.status === 'Verified/Completed') {
      for (const item of (items || [])) {
        const quantity = Number(item.qtyReceived) || 0;
        if (quantity <= 0) continue;

        const medicine = await Medicine.findOne({ sku: item.sku, tenantId: req.tenantId });
        if (medicine) {
          const newStock = medicine.stock + quantity;
          medicine.stock = newStock;
          if (item.expiryDate) {
            medicine.expiry = new Date(item.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' });
          }
          if (newStock === 0) {
            medicine.status = 'Out of Stock';
          } else if (newStock <= 20) {
            medicine.status = 'Low Stock';
          } else {
            medicine.status = 'In Stock';
          }
          await medicine.save();
        } else {
          let stockStatus = 'In Stock';
          if (quantity === 0) {
            stockStatus = 'Out of Stock';
          } else if (quantity <= 20) {
            stockStatus = 'Low Stock';
          }

          await Medicine.create({
            tenantId: req.tenantId,
            name: item.name,
            sku: item.sku,
            stock: quantity,
            unit: item.unit || 'Strip',
            mrp: Number(item.price) * 1.25,
            category: item.category || 'General',
            status: stockStatus,
            expiry: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' }) : '--'
          });
        }
      }
    }

    // 4. Re-evaluate PO status if linked
    const targetPoId = poId || updatedGrn.poId;
    if (targetPoId) {
      const po = await PurchaseOrder.findOne({ _id: targetPoId, tenantId: req.tenantId });
      if (po) {
        let allMatched = true;
        for (const poItem of po.items) {
          const receivedItem = (items || []).find(i => i.sku === poItem.sku);
          const receivedQty = receivedItem ? (Number(receivedItem.qtyReceived) || 0) : 0;
          if (receivedQty < poItem.requiredQty) {
            allMatched = false;
          }
        }
        po.status = allMatched ? 'Fully Received' : 'Partially Received';
        await po.save();
      }
    }

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "goods_receipts" });
      io.to(req.tenantId).emit("data_changed", { type: "medicines" });
      io.to(req.tenantId).emit("data_changed", { type: "purchase_orders" });
    }

    res.json(updatedGrn);
  } catch (error) {
    console.error("Update GRN error:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

