const jwt = require('jsonwebtoken');
const dbRepository = require('../services/dbRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'builder-erp-super-secret-key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No Token Provided' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid Token' });
  }
};

// Middleware to verify Role Permissions
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized: Missing User Info' });
    }

    if (req.user.role === 'Super Admin' || req.user.role === 'Director') {
      return next(); // Admins / Directors have universal access
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ error: `Forbidden: Access Denied for role ${req.user.role}` });
  };
};

module.exports = { verifyToken, authorizeRoles, JWT_SECRET };
