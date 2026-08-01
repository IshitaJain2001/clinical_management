const express = require('express');
const Indent = require('../models/Indent');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(verifyToken);

// Get all indents
router.get('/', async (req, res) => {
  try {
    // Dynamically delete any legacy mock/seeded indents for this tenant
    await Indent.deleteMany({
      tenantId: req.tenantId,
      indentId: { $in: ['#MR0022', '#MR0023', '#MR0024', '#MR0025'] }
    });

    const indents = await Indent.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(indents);
  } catch (error) {
    console.error("Get indents error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new indent
router.post('/', async (req, res) => {
  const { department, indentType, requiredDate, requestedBy, contactNumber, priority, purpose, items } = req.body;
  try {
    // Generate sequential unique ID (e.g. #MR0026)
    const count = await Indent.countDocuments({ tenantId: req.tenantId });
    const nextNum = count + 26; // start sequence
    const indentId = `#MR00${nextNum}`;

    // Calculate totalQty if not sent
    let totalQty = 0;
    if (Array.isArray(items)) {
      totalQty = items.reduce((sum, item) => sum + (Number(item.requiredQty) || 0), 0);
    }

    const indent = await Indent.create({
      tenantId: req.tenantId,
      indentId,
      department,
      indentType,
      requiredDate,
      requestedBy,
      contactNumber,
      priority,
      purpose,
      items,
      totalQty,
      status: 'Pending'
    });

    const Approval = require('../models/Approval');
    await Approval.create({
      tenantId: req.tenantId,
      type: 'receptionist_indent',
      staffId: req.user.staff_id || req.user.id || 'system',
      requesterName: requestedBy || req.user.name || 'Receptionist',
      requesterRole: req.user.role || 'receptionist',
      details: {
        indentId: indent._id,
        indentNumber: indent.indentId,
        department,
        items,
        purpose,
        priority
      },
      comment: purpose || ''
    });

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "indents" });
      io.to(req.tenantId).emit("data_changed", { type: "approvals" });
    }
    res.status(201).json(indent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an indent status
router.put('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const indent = await Indent.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status },
      { returnDocument: 'after' }
    );
    if (!indent) return res.status(404).json({ error: 'Indent not found' });
    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "indents" });
    }
    res.json(indent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
