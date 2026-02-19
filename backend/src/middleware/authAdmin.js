const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'segawon-admin-secret-key-change-in-production';

/**
 * Middleware: Verify admin JWT token
 */
const authAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach admin info to request
    req.admin = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = authAdmin;
