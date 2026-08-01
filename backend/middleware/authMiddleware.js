const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  const tokenString = token.split(' ')[1] || token;
  jwt.verify(tokenString, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    
    // Validate if the password hash or password version has changed
    if (decoded && decoded.role !== 'patient') {
      try {
        let user = await User.findById(decoded.id).select('+password_hash password_version');
        if (!user) {
          user = await User.findOne({
            $or: [
              { staff_id: decoded.staff_id },
              { role: decoded.role }
            ]
          }).select('+password_hash password_version');
        }
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // For tenant staff accounts, enforce strict password version matching
        if (user.role !== 'superadmin' && user.role !== 'super_admin') {
          const tokenVersion = decoded.password_version !== undefined ? decoded.password_version : 0;
          const dbVersion = user.password_version !== undefined ? user.password_version : 0;
          if (tokenVersion !== dbVersion || (decoded.passwordHash && user.password_hash !== decoded.passwordHash)) {
            return res.status(401).json({ error: 'Password changed' });
          }
        }
      } catch (dbErr) {
        return res.status(500).json({ error: 'Verification failed' });
      }
    }
    
    req.user = decoded;
    req.tenantId = decoded.tenantId || 'city_hospital';
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Require Admin Role' });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'super_admin' || req.user.role === 'platform_admin')) {
    next();
  } else {
    res.status(403).json({ error: 'Require Super Admin Role' });
  }
};

const isHrOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'hr')) {
    next();
  } else {
    res.status(403).json({ error: 'Require Admin or HR Role' });
  }
};

module.exports = { verifyToken, isAdmin, isSuperAdmin, isHrOrAdmin };