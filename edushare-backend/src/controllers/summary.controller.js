// ============================================================================
// summary.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic for AI summaries. The flow is: someone generates
// a summary of a lesson (it starts as PENDING) -> a teacher reviews it ->
// approved summaries become visible to students. It also sends notifications
// (e.g. "your summary was approved").
// ============================================================================

const prisma = require('../db')
const path = require('path')
const { extractText } = require('../services/file.service')
const { generateSummary, generateSummaryFromChat } = require('../services/claude.service')

// POST /api/summaries/generate/:lessonId — make an AI summary of a lesson.
const generateLessonSummary = async (req, res) => {
  try {
    const lessonId = Number(req.params.lessonId)
    const { chatHistory } = req.body // optional — sent from chat page

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { teacher: true },
    })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })

    // Reuse cached extraction if available; fall back to parsing.
    // (Same caching trick as the chat controller — parse the file once, store
    //  the text on the lesson, reuse it next time.)
    let text = lesson.extractedText
    if (!text) {
      const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads')
      const filePath = path.join(uploadDir, path.basename(lesson.filePath))
      text = await extractText(filePath, lesson.fileType)
      if (text) {
        await prisma.lesson.update({ where: { id: lessonId }, data: { extractedText: text } }).catch(() => {})
      }
    }

    // If called from chat page, use conversation context for richer summary
    const result = chatHistory && chatHistory.length > 0
      ? await generateSummaryFromChat(lesson.title, text, chatHistory)   // summarize the chat
      : await generateSummary(lesson.title, text)                        // summarize the raw lesson

    const { summary } = result

    const isTeacher = req.user.role === 'TEACHER'
    // Both roles now create a PENDING draft. A teacher reviews and approves
    // their own AI summary (from the chat or the Reviews page) before students
    // can see it — previously a teacher's summary auto-published.
    const status = 'PENDING'
    const generatedBy = isTeacher ? 'TEACHER' : 'STUDENT'

    // Save the summary. content is the structured summary stored as a JSON string.
    const saved = await prisma.summary.create({
      data: {
        content: JSON.stringify(summary),
        status,
        generatedBy,
        lessonId,
        userId: req.user.id,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        lesson: { select: { id: true, title: true } },
      },
    })

    // If a STUDENT made it, notify the lesson's teacher that a review is waiting.
    if (!isTeacher) {
      await prisma.notification.create({
        data: {
          userId: lesson.teacherId,
          message: `${req.user.firstName} ${req.user.lastName} submitted a summary for "${lesson.title}"`,
          link: `/teacher/reviews`,
        },
      })
    }

    res.status(201).json({
      summary: saved,
      parsedContent: summary,      // the object form, handy for the frontend
      message: isTeacher
        ? 'Summary generated — approve it to publish for students'
        : 'Summary generated and submitted for teacher review',
    })
  } catch (err) {
    console.error('Generate summary error:', err)
    res.status(500).json({ message: err.message })
  }
}

// GET /api/summaries/lesson/:lessonId — the PUBLISHED summaries for a lesson.
const getSummariesForLesson = async (req, res) => {
  try {
    const summaries = await prisma.summary.findMany({
      where: {
        lessonId: Number(req.params.lessonId),
        status: { in: ['APPROVED', 'AUTO'] },     // only ones students may see
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(summaries)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/summaries/my — the current student's own summaries (any status).
const getMySummaries = async (req, res) => {
  try {
    const summaries = await prisma.summary.findMany({
      where: { userId: req.user.id },
      include: {
        lesson: { select: { id: true, title: true, module: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(summaries)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/summaries/pending — summaries awaiting THIS teacher's review.
const getPendingSummaries = async (req, res) => {
  try {
    const summaries = await prisma.summary.findMany({
      where: {
        status: 'PENDING',
        lesson: { teacherId: req.user.id },        // only on lessons this teacher owns
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        lesson: { select: { id: true, title: true, module: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(summaries)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/summaries/:id/review — approve or reject a summary.
const reviewSummary = async (req, res) => {
  try {
    const { action, feedback } = req.body
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' })
    }

    const summary = await prisma.summary.findUnique({
      where: { id: Number(req.params.id) },
      include: { lesson: true },
    })
    if (!summary) return res.status(404).json({ message: 'Summary not found' })
    // The lesson's owner can review any summary on it; a teacher can also
    // approve/reject a summary they generated themselves (e.g. from chat).
    const isLessonOwner = summary.lesson.teacherId === req.user.id
    const isOwnSummary  = req.user.role === 'TEACHER' && summary.userId === req.user.id
    if (!isLessonOwner && !isOwnSummary) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Update the status based on the decision.
    const updated = await prisma.summary.update({
      where: { id: Number(req.params.id) },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        feedback: feedback || null,
      },
    })

    // Skip self-notification when a teacher approves their own summary.
    if (summary.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: summary.userId,                  // notify the summary's author
          message: action === 'approve'
            ? `Your summary for "${summary.lesson.title}" was approved! ✅`
            : `Your summary for "${summary.lesson.title}" was rejected. ${feedback ? 'Feedback: ' + feedback : ''}`,
          link: `/student/summaries`,
        },
      })
    }

    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/summaries/:id — one summary, if you're allowed to see it.
const getSummaryById = async (req, res) => {
  try {
    const summary = await prisma.summary.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        lesson: { select: { id: true, title: true } },
      },
    })
    if (!summary) return res.status(404).json({ message: 'Summary not found' })

    // Allowed if: you wrote it, OR it's published, OR you're an admin.
    const isOwner = summary.userId === req.user.id
    const isPublic = ['APPROVED', 'AUTO'].includes(summary.status)
    if (!isOwner && !isPublic && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized' })
    }

    res.json(summary)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = {
  generateLessonSummary,
  getSummariesForLesson,
  getMySummaries,
  getPendingSummaries,
  reviewSummary,
  getSummaryById,
}
