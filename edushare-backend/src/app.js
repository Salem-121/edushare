// ============================================================================
// app.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the heart of the BACKEND server. This is the file you run
// to start the API. It uses Express (a Node.js web framework) and, in order:
//   1. loads settings, 2. adds security/logging middleware, 3. wires up all the
//   route files (each handles one feature like /users or /lessons), and
//   4. starts listening for requests.
//
// "Middleware" = functions that every request passes through on its way in.
// ============================================================================

require('dotenv').config()   // load variables from the .env file into process.env

// Validates JWT_SECRET at import time and bails if missing/weak.
// (Just requiring this file runs its safety check — see jwt.utils.js.)
require('./utils/jwt.utils')

const express = require('express')                  // the web framework
const cors = require('cors')                        // lets the frontend (different port) call us
const helmet = require('helmet')                    // sets safer HTTP headers
const morgan = require('morgan')                    // logs each incoming request
const rateLimit = require('express-rate-limit')     // blocks clients that send too many requests
const path = require('path')

const app = express()                               // create the Express application
const isProd = process.env.NODE_ENV === 'production'  // are we running live or in dev?

// ── Security headers ────────────────────────────────
// crossOriginResourcePolicy is relaxed so the React app on a different port
// can still fetch /uploads previews etc. Tighten when both ends share an origin.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // CSP would need a per-page nonce; deferring
}))

// ── Request logging ─────────────────────────────────
// Prints a line for every request. 'combined' is detailed (prod); 'dev' is short.
app.use(morgan(isProd ? 'combined' : 'dev'))

// ── CORS (supports multiple origins via comma-separated FRONTEND_URL) ──
// CORS decides which websites are allowed to call this API from a browser.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')                  // allow a comma-separated list
  .map(s => s.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Same-origin requests (server-to-server, curl) have no Origin header.
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)   // allowed -> OK
    return cb(new Error(`Origin ${origin} not allowed`))         // not allowed -> reject
  },
  credentials: true,
}))

// ── Body parsing & static files ─────────────────────
app.use(express.json({ limit: '1mb' }))                          // parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' }))    // parse form-encoded bodies
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))  // serve uploaded files

// ── Rate limiting ───────────────────────────────────
// Tight limit on auth endpoints to slow down credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // over any 15-minute window...
  max: 20,                     // ...allow at most 20 auth attempts per client
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Try again in a few minutes.' },
})

// Broad limit on the whole API so one client can't hammer everything.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,         // over any 1-minute window...
  max: 300,                    // ...allow at most 300 requests per client
  standardHeaders: true,
  legacyHeaders: false,
})

// ── Routes ──────────────────────────────────────────
// app.use('/api/x', router) means "send any request starting with /api/x to
// this route file". Each route file lives in src/routes/.
app.use('/api', apiLimiter)                                            // apply the broad limit to all /api routes
app.use('/api/auth', authLimiter, require('./routes/auth.routes'))    // login/register (with the tight limit)
app.use('/api/users',         require('./routes/user.routes'))
app.use('/api/modules',       require('./routes/module.routes'))
app.use('/api/filieres',      require('./routes/filiere.routes'))
app.use('/api/lessons',       require('./routes/lesson.routes'))
app.use('/api/summaries',     require('./routes/summary.routes'))
app.use('/api/notifications', require('./routes/notification.routes'))
app.use('/api/chat',          require('./routes/chat.routes'))
app.use('/api/quizzes',       require('./routes/quiz.routes'))
app.use('/api/practice-quizzes', require('./routes/practiceQuiz.routes'))
app.use('/api/stats',         require('./routes/stats.routes'))

// A simple "is the server alive?" endpoint, handy for monitoring.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Fallbacks ───────────────────────────────────────
// Any URL that didn't match a route above -> 404 Not Found.
app.use((req, res) => res.status(404).json({ message: 'Route not found' }))
// Central error handler: any error thrown in a route ends up here.
app.use((err, req, res, next) => {
  // CORS rejections come through here too — return 403 not 500
  if (/not allowed/i.test(err.message || '')) {
    return res.status(403).json({ message: err.message })
  }
  console.error(err.stack)
  // Hide internal details in production; show them in development.
  res.status(500).json({ message: isProd ? 'Internal server error' : err.message })
})

// ── Start the server ────────────────────────────────
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`🚀 EduShare API running on http://localhost:${PORT}`)
  console.log(`   Allowed CORS origins: ${allowedOrigins.join(', ')}`)
})
