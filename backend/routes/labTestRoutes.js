const express = require('express');
const router = express.Router();
const LabTest = require('../models/LabTest');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Default Standard Lab Test Catalog to seed for new hospitals
const DEFAULT_LAB_TESTS = require('../config/laboratory_master.json');

// Helper to seed catalog if empty
const seedCatalogIfEmpty = async (tenantId) => {
  const count = await LabTest.countDocuments({ tenantId });
  if (count === 0) {
    const seenCodes = new Set();
    const docs = DEFAULT_LAB_TESTS.map(item => {
      const doc = { ...item, tenantId };
      let code = doc.testCode ? doc.testCode.trim() : 'LAB-TEST';
      let counter = 1;
      let newCode = code;
      while (seenCodes.has(newCode)) {
        counter += 1;
        newCode = `${code}-${counter}`;
      }
      doc.testCode = newCode;
      seenCodes.add(newCode);
      return doc;
    });
    await LabTest.insertMany(docs);
  }
};

// Get active lab tests for receptionist appointment dropdown
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    await seedCatalogIfEmpty(tenantId);
    const tests = await LabTest.find({ tenantId, isActive: true }).sort({ category: 1, testName: 1 });
    res.json(tests);
  } catch (err) {
    console.error('Error fetching lab tests:', err);
    res.status(500).json({ error: 'Failed to fetch lab tests' });
  }
});

// Get all lab tests (including inactive) for hospital lab staff/admin management
router.get('/all', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    await seedCatalogIfEmpty(tenantId);
    const tests = await LabTest.find({ tenantId }).sort({ category: 1, testName: 1 });
    res.json(tests);
  } catch (err) {
    console.error('Error fetching all lab tests:', err);
    res.status(500).json({ error: 'Failed to fetch lab test catalog' });
  }
});

// Create a new lab test item & price
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const { testCode, testName, category, price, sampleType, turnaroundTime, normalRange, unit, description } = req.body;

    if (!testName || price === undefined) {
      return res.status(400).json({ error: 'Test name and price are required.' });
    }

    const code = testCode ? testCode.trim().toUpperCase() : `LAB-${Date.now().toString().slice(-6)}`;
    const existing = await LabTest.findOne({ tenantId, testCode: code });
    if (existing) {
      return res.status(400).json({ error: `Test code '${code}' already exists for this hospital.` });
    }

    const test = await LabTest.create({
      tenantId,
      testCode: code,
      testName,
      category: category || 'General',
      price: Number(price) || 0,
      sampleType: sampleType || 'Blood',
      turnaroundTime: turnaroundTime || '24 Hours',
      normalRange: normalRange || '',
      unit: unit || '',
      description: description || '',
      isActive: true
    });

    const io = req.app.get("io");
    if (io && tenantId) {
      io.to(tenantId).emit("data_changed", { type: "lab_catalog" });
    }

    res.status(201).json(test);
  } catch (err) {
    console.error('Error creating lab test:', err);
    res.status(400).json({ error: err.message || 'Failed to create lab test' });
  }
});

// Update an existing lab test item / price / status
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { returnDocument: 'after' }
    );
    if (!test) {
      return res.status(404).json({ error: 'Lab test not found' });
    }

    const io = req.app.get("io");
    if (io && tenantId) {
      io.to(tenantId).emit("data_changed", { type: "lab_catalog" });
    }

    res.json(test);
  } catch (err) {
    console.error('Error updating lab test:', err);
    res.status(400).json({ error: err.message || 'Failed to update lab test' });
  }
});

// Delete a lab test
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const test = await LabTest.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!test) {
      return res.status(404).json({ error: 'Lab test not found' });
    }

    const io = req.app.get("io");
    if (io && tenantId) {
      io.to(tenantId).emit("data_changed", { type: "lab_catalog" });
    }

    res.json({ message: 'Lab test removed successfully' });
  } catch (err) {
    console.error('Error deleting lab test:', err);
    res.status(500).json({ error: err.message || 'Failed to delete lab test' });
  }
});

// Reset / Seed default catalog
router.post('/seed-default', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    await LabTest.deleteMany({ tenantId });
    const seenCodes = new Set();
    const docs = DEFAULT_LAB_TESTS.map(item => {
      const doc = { ...item, tenantId };
      let code = doc.testCode ? doc.testCode.trim() : 'LAB-TEST';
      let counter = 1;
      let newCode = code;
      while (seenCodes.has(newCode)) {
        counter += 1;
        newCode = `${code}-${counter}`;
      }
      doc.testCode = newCode;
      seenCodes.add(newCode);
      return doc;
    });
    const seeded = await LabTest.insertMany(docs);
    res.json({ message: 'Standard Lab Test Catalog seeded successfully', count: seeded.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
