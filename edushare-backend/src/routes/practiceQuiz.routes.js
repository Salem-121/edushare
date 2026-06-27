// ============================================================================
// practiceQuiz.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for private student practice quizzes
// (/api/practice-quizzes/...). EVERY route is student-only — enforced once at
// the top with a combined router.use(protect, requireRole('STUDENT')).
// ============================================================================

const router = require('express').Router()
const {
  createPracticeQuiz,
  getMyPracticeQuizzes,
  getPracticeQuizById,
  submitPracticeQuiz,
  deletePracticeQuiz,
} = require('../controllers/practiceQuiz.controller')
const { protect, requireRole } = require('../middleware/auth.middleware')

// Practice quizzes are a student-only feature: private, self-generated,
// retakeable, and never published to a filière.
router.use(protect, requireRole('STUDENT'))   // login + STUDENT role for all routes below

router.get('/', getMyPracticeQuizzes)         // GET    /api/practice-quizzes      -> my practice quizzes
router.post('/', createPracticeQuiz)          // POST   /api/practice-quizzes      -> save a new one
router.get('/:id', getPracticeQuizById)       // GET    /api/practice-quizzes/123  -> one quiz to take
router.post('/:id/submit', submitPracticeQuiz)// POST   /api/practice-quizzes/123/submit -> grade my answers
router.delete('/:id', deletePracticeQuiz)     // DELETE /api/practice-quizzes/123  -> delete it

module.exports = router
