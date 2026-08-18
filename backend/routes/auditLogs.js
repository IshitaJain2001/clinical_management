const express = require('express');
const AuditLog = require('../models/AuditLog');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const router = express.Router();

// GET /api/audit-logs — list recent audit logs for current tenant
// Query params: limit, action, actor
router.get('/', verifyToken, tenantMiddleware, async (req, res) => {
  try {
    const filter = { tenantId: req.tenantId };
    if (req.query.action) filter.action = req.query.action;
    if (req.query.actor) filter.actor = req.query.actor;
    if (req.query.target) filter.target = req.query.target;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json(logs);
  } catch (err) {
    console.error("Audit log error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/audit-logs — write a new audit log (authenticated)
router.post('/', verifyToken, tenantMiddleware, async (req, res) => {
  try {
    const { action, target, metadata } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });
    const log = await AuditLog.create({
      tenantId: req.tenantId,
      actor: req.user.staff_id || req.user.id || 'system',
      actorName: req.user.name || '',
      actorRole: req.user.role || '',
      action,
      target: target || '',
      metadata: metadata || {}
    });
    res.status(201).json(log);
  } catch (err) {
    console.error("Audit log error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
