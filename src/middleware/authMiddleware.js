import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For civic app simplicity, optional auth or attach anonymous user if no token provided
    req.user = { phone: 'anonymous', role: 'citizen' };
    return next();
  }

  const secret = process.env.JWT_SECRET || 'civicai-super-secret-jwt-key-2026';

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      // Return unauthenticated warning or soft fallback
      req.user = { phone: 'anonymous', role: 'citizen' };
      return next();
    }
    req.user = user;
    next();
  });
}
