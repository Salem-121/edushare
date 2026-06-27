// ============================================================================
// chat.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for the AI chat (/api/chat/...). All routes
// require login. Sessions are saved conversations the user can revisit.
// ============================================================================

const router = require('express').Router()
const {
  chatWithLesson,
  getMySessions,
  getSessionForLesson,
  deleteSession,
} = require('../controllers/chat.controller')
const { protect } = require('../middleware/auth.middleware')

router.use(protect)   // login required for all chat routes

router.get('/sessions',            getMySessions)        // GET    /api/chat/sessions          -> my conversations
router.get('/sessions/:lessonId',  getSessionForLesson)  // GET    /api/chat/sessions/123       -> conversation for a lesson
router.delete('/sessions/:sessionId', deleteSession)     // DELETE /api/chat/sessions/abc       -> delete a conversation
router.post('/:lessonId',          chatWithLesson)       // POST   /api/chat/123                -> send a message about a lesson

module.exports = router
