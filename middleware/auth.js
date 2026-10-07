
const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  // Check cookie or persistent session token
  const token = req.cookies.token || (req.session && req.session.token);

  if (!token) {
    console.log('no token found');
    return res.redirect('/login');
  }

  try {
    const secret = process.env.JWT_SECRET || 'your_fallback_secret_key';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    console.log('user role',req.user.role);
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    res.clearCookie('token');
    if (req.session) {
      req.session.destroy();
    }
    return res.redirect('/login');
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // FIX: Deny access IF user doesn't exist OR user role is NOT in allowedRoles
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).render('error', {
        message: 'Access Denied: You do not have authorization to access this page.'
      });
    }
    next();
  };
};

module.exports = { authenticateUser, requireRole };