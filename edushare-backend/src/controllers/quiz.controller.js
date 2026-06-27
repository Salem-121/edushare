// ============================================================================
// quiz.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic for teacher quizzes — the most involved
// controller. It handles listing (different views per role), taking, creating,
// grading, viewing results, and AI-generating quizzes from a document.
//
// Two important security ideas repeat here:
//   • Students never receive the correct answers (stripAnswers); grading is
//     done on the server in submitQuiz.
//   • A student may only take a quiz once (we block retakes).
// ============================================================================

const prisma = require('../db')
const path = require('path')
const fs = require('fs')
const { extractText } = require('../services/file.service')          // read text out of a file
const { generateQuizFromText } = require('../services/claude.service')  // ask the AI to write questions

// Strip correct answers from questions (for student view)
// (Returns a copy of the quiz where each choice has only id/text/order — the
//  isCorrect flag is removed so the answer key never reaches the browser.)
const stripAnswers = (quiz) => ({
  ...quiz,
  questions: quiz.questions?.map(q => ({
    id: q.id,
    text: q.text,
    order: q.order,
    choices: q.choices.map(c => ({ id: c.id, text: c.text, order: c.order })),
  })),
})

// GET /api/quizzes
// Teacher: own quizzes; Student: quizzes for their filiere; Admin: all
const getQuizzes = async (req, res) => {
  try {
    const user = req.user
    let where = {}                                  // the filter changes based on who's asking

    if (user.role === 'TEACHER') {
      where.teacherId = user.id                     // teachers see only their own quizzes
    } else if (user.role === 'STUDENT') {
      // Students see published quizzes targeted at their filière.
      const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { filiereId: true } })
      if (!fullUser?.filiereId) return res.json([])  // no filière -> no quizzes
      where = {
        published: true,
        filieres: { some: { filiereId: fullUser.filiereId } },
      }
    }
    // (Admin falls through with an empty filter = all quizzes.)

    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        filieres: { include: { filiere: { select: { id: true, name: true, code: true } } } },
        _count: { select: { questions: true, attempts: true } },
      },
    })

    // For students: include whether they already attempted
    // (So the UI can show their score instead of a "Start" button.)
    if (user.role === 'STUDENT') {
      const attempts = await prisma.quizAttempt.findMany({
        where: { studentId: user.id, quizId: { in: quizzes.map(q => q.id) } },
        select: { quizId: true, score: true, completedAt: true },
      })
      // Build a quick lookup of quizId -> attempt, then attach it to each quiz.
      const attemptMap = Object.fromEntries(attempts.map(a => [a.quizId, a]))
      return res.json(quizzes.map(q => ({ ...q, myAttempt: attemptMap[q.id] || null })))
    }

    res.json(quizzes)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/quizzes/:id — for taking the quiz (student) or full view (teacher/admin)
const getQuizById = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const user = req.user

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        filieres: { include: { filiere: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: { orderBy: { order: 'asc' } } },
        },
      },
    })
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' })

    if (user.role === 'STUDENT') {
      // Check filiere matches — students can't open quizzes for other filières.
      const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { filiereId: true } })
      const allowed = quiz.filieres.some(qf => qf.filiereId === fullUser?.filiereId)
      if (!allowed) return res.status(403).json({ message: 'Quiz not available for your filiere' })

      // Block retake — if they already attempted, return their score, not a fresh quiz.
      const existing = await prisma.quizAttempt.findUnique({
        where: { quizId_studentId: { quizId: id, studentId: user.id } },
      })
      if (existing) {
        return res.json({ ...stripAnswers(quiz), alreadyAttempted: true, myAttempt: existing })
      }
      return res.json(stripAnswers(quiz))         // first time: questions WITHOUT the answers
    }

    // A teacher may only view their own quiz in full (with answers).
    if (user.role === 'TEACHER' && quiz.teacherId !== user.id) {
      return res.status(403).json({ message: 'Not your quiz' })
    }

    res.json(quiz)   // teacher/admin get the full quiz including correct answers

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/quizzes (teacher)
// body: { title, description, timeLimit, filiereIds: [], questions: [{ text, choices: [{ text, isCorrect }] }] }
const createQuiz = async (req, res) => {
  try {
    const { title, description, timeLimit, filiereIds, questions } = req.body
    if (!title || !timeLimit) return res.status(400).json({ message: 'Title and time limit are required' })
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: 'At least one question is required' })
    if (!Array.isArray(filiereIds) || filiereIds.length === 0) return res.status(400).json({ message: 'Select at least one filiere' })

    // Validate every question before saving anything.
    for (const q of questions) {
      if (!q.text || !Array.isArray(q.choices) || q.choices.length < 2) {
        return res.status(400).json({ message: 'Each question needs text and at least 2 choices' })
      }
      if (!q.choices.some(c => c.isCorrect)) {
        return res.status(400).json({ message: `Question "${q.text.slice(0, 30)}…" needs a correct choice` })
      }
    }

    // Create the quiz AND its filière links AND its questions/choices in one go.
    // (Prisma's nested `create` writes the related rows together.)
    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description || null,
        timeLimit: Number(timeLimit),
        teacherId: req.user.id,
        filieres: {                                  // link rows to each targeted filière
          create: filiereIds.map(fid => ({ filiereId: Number(fid) })),
        },
        questions: {                                 // create each question...
          create: questions.map((q, qi) => ({
            text: q.text,
            order: qi,                               // keep the original order
            choices: {                               // ...and its choices
              create: q.choices.map((c, ci) => ({
                text: c.text,
                isCorrect: !!c.isCorrect,
                order: ci,
              })),
            },
          })),
        },
      },
      include: {
        filieres: { include: { filiere: true } },
        questions: { include: { choices: true } },
      },
    })

    // Notify students in the selected filieres that a new quiz exists.
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', filiereId: { in: filiereIds.map(Number) } },
      select: { id: true },
    })
    if (students.length > 0) {
      await prisma.notification.createMany({
        data: students.map(s => ({
          userId: s.id,
          message: `New quiz available: ${title}`,
        })),
      })
    }

    res.status(201).json(quiz)
  } catch (err) {
    console.error('Create quiz error:', err)
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/quizzes/:id (teacher who owns it)
// Updates the quiz's top-level fields (not its questions).
const updateQuiz = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = await prisma.quiz.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Quiz not found' })
    if (existing.teacherId !== req.user.id) return res.status(403).json({ message: 'Not your quiz' })

    const { title, description, timeLimit, published } = req.body
    const data = {}                                  // only update what was sent
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (timeLimit !== undefined) data.timeLimit = Number(timeLimit)
    if (published !== undefined) data.published = !!published

    const quiz = await prisma.quiz.update({ where: { id }, data })
    res.json(quiz)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/quizzes/:id
const deleteQuiz = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = await prisma.quiz.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Quiz not found' })
    if (req.user.role !== 'ADMIN' && existing.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not your quiz' })
    }
    await prisma.quiz.delete({ where: { id } })
    res.json({ message: 'Quiz deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/quizzes/:id/submit (student)
// body: { answers: { [questionId]: choiceId } }
// Grades the answers on the SERVER (the browser never had the answer key).
const submitQuiz = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const studentId = req.user.id
    const { answers } = req.body
    if (!answers || typeof answers !== 'object') return res.status(400).json({ message: 'Answers required' })

    // Verify student's filiere allows this quiz
    const fullUser = await prisma.user.findUnique({ where: { id: studentId }, select: { filiereId: true } })
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        filieres: true,
        questions: { include: { choices: true } },   // load the choices (with the correct flags)
      },
    })
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' })
    const allowed = quiz.filieres.some(qf => qf.filiereId === fullUser?.filiereId)
    if (!allowed) return res.status(403).json({ message: 'Quiz not available for your filiere' })

    // Prevent retake — one attempt per student per quiz.
    const previous = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId: id, studentId } },
    })
    if (previous) return res.status(400).json({ message: 'Quiz already submitted', attempt: previous })

    // Grade: count how many of the student's chosen choices were the correct ones.
    let correctCount = 0
    for (const q of quiz.questions) {
      const chosen = Number(answers[q.id])           // the choice id they picked for this question
      const correctChoice = q.choices.find(c => c.isCorrect)
      if (correctChoice && chosen === correctChoice.id) correctCount++
    }
    const total = quiz.questions.length
    const score = total === 0 ? 0 : Math.round((correctCount / total) * 100)   // percentage

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: id,
        studentId,
        score,
        correctCount,
        totalQuestions: total,
        answers: JSON.stringify(answers),
      },
    })

    // Notify the teacher that a student turned in the quiz, with their score.
    await prisma.notification.create({
      data: {
        userId: quiz.teacherId,
        message: `${req.user.firstName} ${req.user.lastName} submitted "${quiz.title}" — ${score}%`,
      },
    })

    res.json({ score, correctCount, totalQuestions: total, attemptId: attempt.id })
  } catch (err) {
    console.error('Submit quiz error:', err)
    res.status(500).json({ message: err.message })
  }
}

// GET /api/quizzes/:id/attempts (teacher who owns)
// Returns every student's attempt + score, for the results page.
const getQuizAttempts = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const quiz = await prisma.quiz.findUnique({ where: { id } })
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' })
    if (req.user.role !== 'ADMIN' && quiz.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not your quiz' })
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: id },
      orderBy: { completedAt: 'desc' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, filiere: { select: { name: true, code: true } } },
        },
      },
    })
    res.json(attempts)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/quizzes/generate (teacher or student)
// multipart: file=<pdf|docx>, body: { numQuestions, title? }
// Extracts the document text, asks the AI to build a QCM, and returns the
// generated questions WITHOUT saving anything. The caller decides what to do
// next: a teacher edits + publishes them; a student saves them as a private
// practice quiz. The uploaded file is treated as transient and removed after
// extraction.
const generateQuizFromFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A PDF or DOCX file is required' })

  const filePath = req.file.path
  try {
    // 1) Pull the text out of the uploaded document.
    const fileType = path.extname(req.file.originalname).replace('.', '').toLowerCase()
    const text = await extractText(filePath, fileType)

    // Bail if we couldn't read meaningful text (e.g. a scanned, image-only PDF).
    if (!text || text.length < 40 || /not supported|could not extract/i.test(text)) {
      return res.status(422).json({ message: 'Could not read enough text from this file. Try a text-based PDF or a DOCX.' })
    }

    // Clamp the requested question count to a sensible 1–20 range.
    const numQuestions = Math.max(1, Math.min(Number(req.body.numQuestions) || 5, 20))
    const baseTitle = (req.body.title || '').trim() ||
      path.basename(req.file.originalname, path.extname(req.file.originalname))

    const result = await generateQuizFromText(baseTitle, text, numQuestions)
    if (!result.success) {
      return res.status(422).json({ message: result.error || 'Quiz generation failed. Please try again.' })
    }

    res.json({
      title: baseTitle,
      sourceName: req.file.originalname,
      questions: result.questions,
    })
  } catch (err) {
    console.error('Generate quiz error:', err)
    res.status(500).json({ message: err.message })
  } finally {
    // Best-effort cleanup — we never need the file again.
    fs.promises.unlink(filePath).catch(() => {})
  }
}

module.exports = {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getQuizAttempts,
  generateQuizFromFile,
}
