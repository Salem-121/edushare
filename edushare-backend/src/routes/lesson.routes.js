// ============================================================================
// lesson.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for lessons (/api/lessons/...). All routes
// require login. Browsing/downloading is for everyone; uploading and managing
// is teacher/admin only. Uploads pass through the `upload` file middleware.
// ============================================================================

const router = require('express').Router()
const {
  getLessons,
  getMyLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  downloadLesson,
} = require('../controllers/lesson.controller')
const { protect, requireRole } = require('../middleware/auth.middleware')
const upload = require('../middleware/upload.middleware')   // handles the uploaded file

// All routes require login
router.use(protect)

// Browse & download - students and teachers
router.get('/', getLessons)                                 // GET /api/lessons          -> browse all
router.get('/my', requireRole('TEACHER', 'ADMIN'), getMyLessons)  // GET /api/lessons/my  -> my uploads
router.get('/:id', getLessonById)                           // GET /api/lessons/123      -> one lesson
router.get('/:id/download', downloadLesson)                 // GET /api/lessons/123/download -> the file

// Upload & manage - teachers and admin only
// upload.single('file') pulls the file named "file" out of the request first.
router.post('/', requireRole('TEACHER', 'ADMIN'), upload.single('file'), createLesson)
router.put('/:id', requireRole('TEACHER', 'ADMIN'), updateLesson)
router.delete('/:id', requireRole('TEACHER', 'ADMIN'), deleteLesson)

module.exports = router
