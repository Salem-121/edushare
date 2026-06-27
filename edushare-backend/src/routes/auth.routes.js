// ============================================================================
// auth.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for authentication. A "route" says
// "when a request with THIS method (GET/POST/...) hits THIS path, run THIS
// controller function". These paths are reached at /api/auth/... (see app.js).
// ============================================================================

const router = require('express').Router()                    // a mini sub-app for these routes
const { register, login, getMe } = require('../controllers/auth.controller')  // the handler functions
const { protect } = require('../middleware/auth.middleware')  // the "must be logged in" gate

router.post('/register', register)      // POST /api/auth/register  -> create a new account
router.post('/login', login)            // POST /api/auth/login     -> log in, get a token
router.get('/me', protect, getMe)       // GET  /api/auth/me        -> who am I? (login required)

module.exports = router
