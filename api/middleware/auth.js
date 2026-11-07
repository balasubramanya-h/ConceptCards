const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - verifies JWT Bearer token and attaches authenticated user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token was provided.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'conceptcards_production_secure_jwt_secret_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user account associated with this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Authorization token is invalid or expired. Please sign in again.',
    });
  }
};

/**
 * Optional authentication - extracts user if token is provided, proceeds anonymously otherwise
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'conceptcards_production_secure_jwt_secret_2026';
    const decoded = jwt.verify(token, secret);
    req.user = await User.findById(decoded.id);
  } catch (err) {
    req.user = null;
  }

  next();
};

module.exports = {
  protect,
  optionalAuth,
};

