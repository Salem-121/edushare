// ============================================================================
// notification.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for the notifications bell
// (/api/notifications/...). All routes require login. Note the ORDER: the more
// specific "/read-all" is listed before "/:id/read" so it isn't mistaken for an
// id named "read-all".
// ============================================================================

const router = require('express').Router()
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notification.controller')
const { protect } = require('../middleware/auth.middleware')

router.use(protect)   // login required

router.get('/', getNotifications)          // GET /api/notifications          -> my notifications
router.put('/read-all', markAllAsRead)     // PUT /api/notifications/read-all -> mark every one read
router.put('/:id/read', markAsRead)        // PUT /api/notifications/123/read -> mark one read

module.exports = router
