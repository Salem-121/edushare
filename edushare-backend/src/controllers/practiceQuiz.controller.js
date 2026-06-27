// ============================================================================
// practiceQuiz.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic for a student's PRIVATE practice quizzes. A key
// security idea here: grading happens on the server. When the student fetches a
// quiz to take, the correct answers are stripped out; only on submit does the
// server compare against the stored answer key. That way the answers can't be
// peeked at in the browser.
// ============================================================================

const prisma = require('../db')

// Practice quizzes are private to the student who created them. Questions are
// stored as a JSON blob: [{ text, choices: [{ text, isCorrect }] }].

// Validate + normalize the questions payload coming from the client so a bad
// body can never corrupt the stored quiz or break grading later.
const sanitizeQuestions = (raw) => {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const q of raw) {
    const text = (q?.text || '').toString().trim()
    let choices = Array.isArray(q?.choices) ? q.choices : []
    // Clean each choice: trim its text, force isCorrect to a real true/false,
    // and drop empty ones.
    choices = choices
      .map(c => ({ text: (c?.text || '').toString().trim(), isCorrect: !!c?.isCorrect }))
      .filter(c => c.text)
    if (!text || choices.length < 2) continue        // skip questions with no text or <2 choices
    // Guarantee exactly one correct answer (default to the first if needed).
    if (choices.filter(c => c.isCorrect).length !== 1) {
      choices = choices.map((c, i) => ({ ...c, isCorrect: i === 0 }))
    }
    out.push({ text, choices })
  }
  return out
}

// Shape a row for the "my quizzes" list — never ships the answer key.
const toListItem = (pq) => ({
  id: pq.id,
  title: pq.title,
  timeLimit: pq.timeLimit,
  sourceName: pq.sourceName,
  createdAt: pq.createdAt,
  questionCount: safeCount(pq.questions),
  lastAttempt: pq.completedAt                          // include the last score if they've taken it
    ? { score: pq.score, correctCount: pq.correctCount, totalQuestions: pq.totalQuestions, completedAt: pq.completedAt }
    : null,
})

// Count questions from the JSON string without crashing on bad data.
const safeCount = (json) => {
  try { return JSON.parse(json).length } catch { return 0 }
}

// POST /api/practice-quizzes — save a new practice quiz.
const createPracticeQuiz = async (req, res) => {
  try {
    const { title, timeLimit, questions, sourceName } = req.body
    const clean = sanitizeQuestions(questions)        // never trust the raw input
    if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required' })
    if (!timeLimit || Number(timeLimit) < 1) return res.status(400).json({ message: 'Time limit must be at least 1 minute' })
    if (clean.length === 0) return res.status(400).json({ message: 'At least one valid question is required' })

    const pq = await prisma.practiceQuiz.create({
      data: {
        title: title.trim(),
        timeLimit: Number(timeLimit),
        questions: JSON.stringify(clean),             // store questions+answers as JSON text
        sourceName: sourceName || null,
        studentId: req.user.id,                       // owned by this student
      },
    })
    res.status(201).json(toListItem(pq))
  } catch (err) {
    console.error('Create practice quiz error:', err)
    res.status(500).json({ message: err.message })
  }
}

// GET /api/practice-quizzes (the student's own quizzes)
const getMyPracticeQuizzes = async (req, res) => {
  try {
    const quizzes = await prisma.practiceQuiz.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(quizzes.map(toListItem))                 // list view never includes answers
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/practice-quizzes/:id  (for taking — answers are stripped)
const getPracticeQuizById = async (req, res) => {
  try {
    const pq = await prisma.practiceQuiz.findUnique({ where: { id: Number(req.params.id) } })
    if (!pq) return res.status(404).json({ message: 'Practice quiz not found' })
    if (pq.studentId !== req.user.id) return res.status(403).json({ message: 'Not your quiz' })

    let questions = []
    try { questions = JSON.parse(pq.questions) } catch { questions = [] }
    // Strip the answer key — grading happens server-side on submit.
    // (We send only the question text + choice text, never which one is correct.)
    const stripped = questions.map((q, qi) => ({
      index: qi,
      text: q.text,
      choices: (q.choices || []).map((c, ci) => ({ index: ci, text: c.text })),
    }))

    res.json({
      id: pq.id,
      title: pq.title,
      timeLimit: pq.timeLimit,
      sourceName: pq.sourceName,
      createdAt: pq.createdAt,
      questions: stripped,
      lastAttempt: pq.completedAt
        ? { score: pq.score, correctCount: pq.correctCount, totalQuestions: pq.totalQuestions, completedAt: pq.completedAt }
        : null,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/practice-quizzes/:id/submit
// body: { answers: { [questionIndex]: choiceIndex } }
const submitPracticeQuiz = async (req, res) => {
  try {
    const { answers } = req.body
    if (!answers || typeof answers !== 'object') return res.status(400).json({ message: 'Answers required' })

    const pq = await prisma.practiceQuiz.findUnique({ where: { id: Number(req.params.id) } })
    if (!pq) return res.status(404).json({ message: 'Practice quiz not found' })
    if (pq.studentId !== req.user.id) return res.status(403).json({ message: 'Not your quiz' })

    let questions = []
    try { questions = JSON.parse(pq.questions) } catch { questions = [] }

    // Grade each question by comparing the chosen choice to the correct one.
    let correctCount = 0
    const review = questions.map((q, qi) => {
      const correctIndex = (q.choices || []).findIndex(c => c.isCorrect)   // which choice is right
      const chosenIndex = answers[qi] === undefined || answers[qi] === null ? null : Number(answers[qi])
      const isCorrect = chosenIndex === correctIndex
      if (isCorrect) correctCount++
      return { index: qi, correctIndex, chosenIndex, isCorrect }           // detail for the answer review
    })
    const total = questions.length
    const score = total === 0 ? 0 : Math.round((correctCount / total) * 100)  // percentage

    // Practice quizzes can be retaken — overwrite with the latest attempt.
    await prisma.practiceQuiz.update({
      where: { id: pq.id },
      data: {
        score,
        correctCount,
        totalQuestions: total,
        answers: JSON.stringify(answers),
        completedAt: new Date(),
      },
    })

    res.json({ score, correctCount, totalQuestions: total, review })   // includes the per-question review
  } catch (err) {
    console.error('Submit practice quiz error:', err)
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/practice-quizzes/:id — delete one of your own practice quizzes.
const deletePracticeQuiz = async (req, res) => {
  try {
    const pq = await prisma.practiceQuiz.findUnique({ where: { id: Number(req.params.id) } })
    if (!pq) return res.status(404).json({ message: 'Practice quiz not found' })
    if (pq.studentId !== req.user.id) return res.status(403).json({ message: 'Not your quiz' })
    await prisma.practiceQuiz.delete({ where: { id: pq.id } })
    res.json({ message: 'Practice quiz deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = {
  createPracticeQuiz,
  getMyPracticeQuizzes,
  getPracticeQuizById,
  submitPracticeQuiz,
  deletePracticeQuiz,
}
