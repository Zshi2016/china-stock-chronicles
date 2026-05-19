/**
 * JWT authentication middleware.
 *
 * Exports:
 *   requireAuth  — blocks request (401) if no valid token.
 *   optionalAuth — attaches req.user if valid token present, but continues either way.
 */

const jwt = require('jsonwebtoken');
const { getUserById } = require('../services/user');

function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Verify JWT and attach `req.user`. Returns decoded payload on success, null on failure.
 */
function verifyAndAttach(req) {
  const token = extractToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getSecret());
    const user = getUserById(decoded.id);
    if (!user) return null;

    req.user = user;
    return decoded;
  } catch (_err) {
    return null;
  }
}

/**
 * Middleware: require a valid JWT.
 * Responds 401 if no valid token is present.
 */
function requireAuth(req, res, next) {
  const payload = verifyAndAttach(req);
  if (!payload) {
    return res.status(401).json({
      error: true,
      message: 'Authentication required',
      status: 401,
    });
  }
  next();
}

/**
 * Middleware: optionally parse JWT.
 * Attaches `req.user` if token is valid; proceeds silently otherwise.
 */
function optionalAuth(req, _res, next) {
  verifyAndAttach(req);
  next();
}

module.exports = { requireAuth, optionalAuth };
