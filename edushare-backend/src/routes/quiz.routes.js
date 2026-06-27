// ============================================================================
// quiz.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for teacher quizzes (/api/quizzes/...). It mixes
// permissions: anyone logged in can read, teachers create/edit, students submit,
// and both teachers and students can use the AI generator.
// ============================================================================

const router = require('express').Router()
const {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getQuizAttempts,
  generateQuizFromFile,
} = require('../controllers/quiz.controller')
const { protect, requireRole } = require('../middleware/auth.middleware')
const upload = require('../middleware/upload.middleware')

// AI generation is available to both teachers and students (students turn the
// result into a private practice quiz; teachers edit + publish it).
router.post('/generate', protect, requireRole('TEACHER', 'STUDENT'), upload.single('file'), generateQuizFromFile)

router.get('/', protect, getQuizzes)                         // list quizzes
router.get('/:id', protect, getQuizById)                     // one quiz (its questions)
router.get('/:id/attempts', protect, requireRole('TEACHER', 'ADMIN'), getQuizAttempts)  // who attempted + scores

router.post('/', protect, requireRole('TEACHER'), createQuiz)         // teacher creates
router.put('/:id', protect, requireRole('TEACHER'), updateQuiz)       // teacher edits
router.delete('/:id', protect, requireRole('TEACHER', 'ADMIN'), deleteQuiz)  // teacher/admin deletes

router.post('/:id/submit', protect, requireRole('STUDENT'), submitQuiz)  // student turns in answers

module.exports = router
