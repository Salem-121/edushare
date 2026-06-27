// ============================================================================
// auth.middleware.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the backend's two security "gates", used by route files:
//   • protect      — requires a valid login token; loads the user onto req.user.
//   • requireRole  — requires the logged-in user to have a specific role.
// A "middleware" runs before the actual route handler and can stop the request
// (e.g. return 401 Unauthorized) if the checks fail.
// ============================================================================

const prisma = require('../db')
const { verifyToken } = require('../utils/jwt.utils')

// Verify JWT and attach user to request
// (Reads the "Authorization: Bearer <token>" header, checks the token, then
//  looks up the user in the database and stores it on req.user for the route.)
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' })   // no token -> blocked
    }

    const token = authHeader.split(' ')[1]      // grab the part after "Bearer "
    const decoded = verifyToken(token)          // throws if invalid/expired

    // Look up the current user (only the safe fields — never the password).
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        filiereId: true,
        createdAt: true,
      },
    })

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' })  // token valid but user deleted
    }

    req.user = user   // hand the user to the next handler
    next()            // continue to the actual route
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' })
  }
}

// Check that user has one of the required roles
// Used like: requireRole('ADMIN') or requireRole('TEACHER', 'ADMIN').
// Returns a middleware function, so it must run AFTER `protect`.
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' })       // protect didn't run / no user
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' })  // wrong role
    }
    next()   // role is allowed -> continue
  }
}

module.exports = { protect, requireRole }
