const express = require('express');
const LabInventory = require('../models/LabInventory');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(verifyToken);

// Seeding helper for default lab inventory items (scoped to tenant)
const seedDefaultLabInventory = async (tenantId) => {
  // Auto-seeding disabled to ensure only real user data is displayed
  return;
};

// Get all lab inventory items (scoped to tenant)
router.get('/', async (req, res) => {
  try {
    await seedDefaultLabInventory(req.tenantId);
    const inventory = await LabInventory.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(inventory);
  } catch (error) {
    console.error("Lab inventory error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new lab inventory item (scoped to tenant)
router.post('/', async (req, res) => {
  try {
    const { name, category, stock, unit, threshold } = req.body;
    const newItem = await LabInventory.create({
      tenantId: req.tenantId,
      name,
      category,
      stock: Number(stock) || 0,
      unit,
      threshold: Number(threshold) || 20,
      lastRestock: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    });
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a lab inventory item (Edit or Restock, scoped to tenant)
router.put('/:id', async (req, res) => {
  try {
    const { name, category, stock, unit, threshold, isRestock, addQty } = req.body;
    const item = await LabInventory.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (name !== undefined) item.name = name;
    if (category !== undefined) item.category = category;
    if (unit !== undefined) item.unit = unit;
    if (threshold !== undefined) item.threshold = Number(threshold);

    if (isRestock && addQty !== undefined) {
      item.stock += Number(addQty);
      item.lastRestock = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else if (stock !== undefined) {
      item.stock = Number(stock);
    }

    await item.save(); // Triggers status recalculation middleware
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a lab inventory item (scoped to tenant)
router.delete('/:id', async (req, res) => {
  try {
    const item = await LabInventory.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error("Lab inventory error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
