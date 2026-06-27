// ============================================================================
// stats.controller.js
// ----------------------------------------------------------------------------
// WHAT A "CONTROLLER" IS: the function that actually does the work for a route.
// It receives the request (req) and sends back the response (res). This one
// returns the public counts shown on the login page.
// ============================================================================

const prisma = require('../db')   // our database connection

// GET /api/stats — public platform totals shown on the landing/login page.
// Intentionally unauthenticated and limited to harmless aggregate counts.
const getPublicStats = async (req, res) => {
  try {
    // Promise.all runs all three counts at the same time (faster than one by one).
    const [students, teachers, lessons] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),   // how many students
      prisma.user.count({ where: { role: 'TEACHER' } }),   // how many teachers
      prisma.lesson.count(),                                // how many lessons
    ])
    res.json({ students, teachers, lessons })   // send the numbers back as JSON
  } catch (err) {
    res.status(500).json({ message: err.message })   // something broke -> 500 error
  }
}

module.exports = { getPublicStats }
