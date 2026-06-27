// ============================================================================
// summary.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for AI summaries (/api/summaries/...). Students
// generate summaries and view their own; teachers see pending ones and approve
// or reject them. All routes require login (router.use(protect)).
// ============================================================================

const router = require('express').Router()
const {
  generateLessonSummary,
  getSummariesForLesson,
  getMySummaries,
  getPendingSummaries,
  reviewSummary,
  getSummaryById,
} = require('../controllers/summary.controller')
const { protect, requireRole } = require('../middleware/auth.middleware')

router.use(protect)   // everything below requires login

// Generate - both teachers and students
router.post('/generate/:lessonId', requireRole('TEACHER', 'STUDENT'), generateLessonSummary)

// Student views their own summaries
router.get('/my', requireRole('STUDENT'), getMySummaries)

// Teacher views pending submissions for their lessons
router.get('/pending', requireRole('TEACHER'), getPendingSummaries)

// Teacher approves or rejects a summary
router.put('/:id/review', requireRole('TEACHER'), reviewSummary)

// Approved summaries for a lesson (all roles)
router.get('/lesson/:lessonId', getSummariesForLesson)

// Single summary
router.get('/:id', getSummaryById)

module.exports = router
