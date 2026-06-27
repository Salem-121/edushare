// ============================================================================
// notification.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic behind the notifications bell. It lists a user's
// notifications and marks them read. req.user (set by the `protect` middleware)
// tells us who is asking, so users only ever see/touch their own notifications.
// ============================================================================

const prisma = require('../db')

// GET /api/notifications?take=20&cursor=<lastId>
// Returns the newest notifications. Supports "cursor pagination": pass the id of
// the last item you saw to fetch the next page.
const getNotifications = async (req, res) => {
  try {
    const take = Math.min(Number(req.query.take) || 20, 100)        // page size (max 100)
    const cursor = req.query.cursor ? Number(req.query.cursor) : null  // where to continue from
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },        // only this user's notifications
      orderBy: { createdAt: 'desc' },         // newest first
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),  // skip past the cursor item if given
    })
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/notifications/:id/read — mark a single notification as read.
const markAsRead = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = await prisma.notification.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Notification not found' })
    // Security check: make sure it actually belongs to the requester.
    if (existing.userId !== req.user.id) return res.status(403).json({ message: 'Not your notification' })
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    })
    res.json(notification)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/notifications/read-all — mark all of this user's unread ones as read.
const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },   // only this user's unread ones
      data: { read: true },
    })
    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead }
