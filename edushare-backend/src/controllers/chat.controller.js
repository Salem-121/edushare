// ============================================================================
// chat.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic behind "Chat with a PDF". When a message comes
// in, it: finds the lesson, gets (or extracts and caches) the lesson's text,
// asks the AI for a reply, saves both messages, and sends the reply back.
// "Sessions" are saved conversations a user can revisit.
// ============================================================================

const prisma = require('../db')
const path = require('path')
const { extractText } = require('../services/file.service')    // pulls text out of a PDF/DOCX
const { chatWithPDF } = require('../services/claude.service')  // asks the AI for an answer

// POST /api/chat/:lessonId
// Body: { messages, sessionId? }
// Creates or continues a chat session, saves every message
const chatWithLesson = async (req, res) => {
  try {
    const lessonId = Number(req.params.lessonId)
    const { messages, sessionId } = req.body

    // Need at least one message to answer.
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Messages array is required' })
    }

    // Load the lesson we're chatting about.
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true, title: true, filePath: true, fileType: true, extractedText: true,
        module: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })

    // Get or create session
    // (Reuse the existing conversation if one was passed AND it's the user's own;
    //  otherwise start a fresh one.)
    let session
    if (sessionId) {
      const found = await prisma.chatSession.findUnique({ where: { id: sessionId } })
      // Only reuse session if it belongs to the current user
      if (found && found.userId === req.user.id) session = found
    }
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: req.user.id, lessonId },
      })
    }

    // Extract lesson text for AI context — cache the result on the lesson
    // row so a single PDF isn't re-parsed on every chat turn (huge perf win
    // for large PDFs, and avoids repeated disk reads).
    let lessonText = lesson.extractedText                    // use the cached text if we have it
    if (!lessonText) {
      const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads')
      const filePath = path.join(uploadDir, path.basename(lesson.filePath))
      lessonText = await extractText(filePath, lesson.fileType)   // first time: read + parse the file
      if (lessonText) {
        // Save the extracted text back so next time we skip the parsing.
        await prisma.lesson.update({ where: { id: lesson.id }, data: { extractedText: lessonText } }).catch(() => {})
      }
    }

    // Get AI reply — pass the lesson title + text + the conversation so far.
    const reply = await chatWithPDF(lesson.title, lessonText, messages)

    // Save the latest user message + AI reply to DB (so the session persists).
    const lastUserMsg = messages[messages.length - 1]
    await prisma.chatMessage.createMany({
      data: [
        { sessionId: session.id, role: lastUserMsg.role, content: lastUserMsg.content },
        { sessionId: session.id, role: 'assistant', content: reply },
      ],
    })

    // Update session timestamp (so it sorts to the top of "recent chats").
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    })

    res.json({ reply, sessionId: session.id })   // send the reply + which session it belongs to
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ message: err.message })
  }
}

// GET /api/chat/sessions — get all chat sessions for current user
const getMySessions = async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },             // most recently used first
      include: {
        lesson: { select: { id: true, title: true, module: { select: { name: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },   // include the messages, oldest first
      },
    })
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/chat/sessions/:lessonId — get session for a specific lesson
const getSessionForLesson = async (req, res) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: {
        userId: req.user.id,
        lessonId: Number(req.params.lessonId),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        lesson: { select: { id: true, title: true, module: { select: { name: true } } } },
      },
    })
    res.json(session || null)                     // null if there's no conversation yet
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/chat/sessions/:sessionId — clear a session
const deleteSession = async (req, res) => {
  try {
    const session = await prisma.chatSession.findUnique({ where: { id: Number(req.params.sessionId) } })
    if (!session) return res.status(404).json({ message: 'Session not found' })
    // Make sure you can only delete your OWN conversation.
    if (session.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' })
    await prisma.chatSession.delete({ where: { id: session.id } })
    res.json({ message: 'Session deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { chatWithLesson, getMySessions, getSessionForLesson, deleteSession }
