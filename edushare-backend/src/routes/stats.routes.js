// ============================================================================
// stats.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: a single PUBLIC route (/api/stats) that returns the
// student/teacher/lesson counts shown on the login page. No login required, so
// it has no `protect` middleware.
// ============================================================================

const router = require('express').Router()
const { getPublicStats } = require('../controllers/stats.controller')

// Public route — no auth. Powers the landing page counters.
router.get('/', getPublicStats)   // GET /api/stats -> { students, teachers, lessons }

module.exports = router
