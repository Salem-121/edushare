// ============================================================================
// claude.service.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the "talk to the AI" service — the only place that actually
// calls a language model. It exposes four jobs the rest of the app uses:
//   • generateSummary          — summarize a lesson into structured JSON
//   • chatWithPDF              — answer a chat question about a lesson
//   • generateSummaryFromChat  — summarize using the chat conversation too
//   • generateQuizFromText     — write a multiple-choice quiz from a document
//
// HEADS UP: despite the filename, this code currently talks to the **Groq** API
// using Llama models (not Anthropic's Claude). The filename is historical. The
// big theme below is staying UNDER Groq's free-tier token limits by trimming
// the lesson text + chat history, and falling back to a smaller model if the
// big one is rate-limited.
// ============================================================================

const Groq = require('groq-sdk')                          // the AI provider's SDK

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })  // authenticated client (key from .env)

// ── Token-budget knobs ──────────────────────────────────────────
// Groq's free tier limits llama-3.3-70b to ~6,000 tokens/minute. Sending the
// entire 8000-word lesson plus a long chat history on every turn blows that
// budget after a single message. We trim aggressively per call and fall back
// to llama-3.1-8b-instant (~30k TPM) when the big model rate-limits.
const PRIMARY_MODEL  = 'llama-3.3-70b-versatile'
const FALLBACK_MODEL = 'llama-3.1-8b-instant'

const CHAT_LESSON_WORDS    = 2500   // ~3300 tokens of context for chat
const SUMMARY_LESSON_WORDS = 5000   // ~6500 tokens for summary (one-shot)
const QUIZ_LESSON_WORDS    = 4000   // ~5200 tokens for quiz generation (one-shot)
const MAX_HISTORY_TURNS    = 6      // last 6 user/assistant pairs

// Crude word-cap that preserves sentence boundaries when possible.
// (Cuts text down to maxWords and tags it "…[truncated]" so we don't send too
//  much to the AI and blow the token budget.)
function clampWords(text, maxWords) {
  if (!text) return ''
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + ' …[truncated]'
}

// Keep only the last N user/assistant turns (system prompt is added separately
// by the caller). Earlier history bloats every subsequent request.
// (maxTurns*2 because each "turn" is a user message + an assistant reply.)
function trimHistory(messages, maxTurns = MAX_HISTORY_TURNS) {
  const nonSystem = messages.filter(m => m.role !== 'system')
  if (nonSystem.length <= maxTurns * 2) return nonSystem
  return nonSystem.slice(-maxTurns * 2)   // keep only the most recent ones
}

// Robustly turn the AI's reply into a JSON object.
// WHY THIS EXISTS: the model is *supposed* to return pure JSON, but sometimes it
// wraps it in ```code fences``` or adds a sentence like "Here is the quiz:" first.
// A plain JSON.parse on that throws errors like "Unterminated fractional number"
// (it tried to read the "1." in "1. ..." as a number). This helper cleans the
// text and, if needed, snips out just the {...} part before parsing.
function parseAiJson(raw) {
  if (!raw) throw new Error('Empty AI response')
  // 1) Drop any ```json / ``` code fences the model may have added.
  let text = raw.replace(/```json|```/gi, '').trim()
  // 2) Try parsing as-is first (the happy path).
  try { return JSON.parse(text) } catch { /* fall through to step 3 */ }
  // 3) Otherwise, grab everything from the first "{" to the last "}" — that
  //    discards any prose before/after the JSON object — and parse that.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    return JSON.parse(text.slice(start, end + 1))
  }
  // 4) Give up — let the caller handle the failure.
  throw new Error('AI did not return valid JSON')
}

// Is this error a "you're sending too much, too fast" rate-limit error?
function isRateLimit(err) {
  const status = err?.status || err?.response?.status
  const msg = err?.message || ''
  return status === 429 || /rate[-\s]?limit|TPM|TPD|RPM/i.test(msg)   // 429 = Too Many Requests
}

// Try the primary model; on 429 (rate limit), automatically retry the same
// call against the faster/lighter fallback model. Any other failure throws.
// This is the single helper all four AI jobs below go through.
async function withModelFallback(params) {
  try {
    return await groq.chat.completions.create({ ...params, model: PRIMARY_MODEL })   // try the big model
  } catch (err) {
    if (!isRateLimit(err)) throw err                                                  // real error -> give up
    console.warn(`[ai] ${PRIMARY_MODEL} rate-limited — falling back to ${FALLBACK_MODEL}`)
    return await groq.chat.completions.create({ ...params, model: FALLBACK_MODEL })   // retry on the small model
  }
}

// For the jobs that must return JSON. We FIRST ask the API to guarantee valid
// JSON ("json_object" mode). If that specific request fails for any reason
// other than a rate-limit (e.g. the model rejects/limits JSON mode, or the JSON
// got too long and was rejected), we retry once WITHOUT json mode and rely on
// parseAiJson() to clean up the reply. This way one fussy response can't break
// the whole feature.
async function withJsonResponse(params) {
  try {
    return await withModelFallback({ ...params, response_format: { type: 'json_object' } })
  } catch (err) {
    if (isRateLimit(err)) throw err   // a real rate limit — let the caller report it
    console.warn('[ai] JSON mode failed, retrying without it:', err.message)
    return await withModelFallback(params)   // plain call; parseAiJson handles the messy output
  }
}

// ─── GENERATE STRUCTURED SUMMARY ────────────────────
// Asks the AI to read a lesson and return a structured summary as JSON.
const generateSummary = async (lessonTitle, lessonText) => {
  const trimmed = clampWords(lessonText, SUMMARY_LESSON_WORDS)   // cut the text to fit the budget

  // The "prompt" is the instruction we send the AI. We demand pure JSON back so
  // we can parse it reliably (no markdown, no backticks).
  const prompt = `You are an academic assistant helping university students.
Generate a structured summary of this lesson.
Respond with ONLY valid JSON, no markdown, no backticks:
{
  "title": "lesson title",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "keyPoints": [
    { "heading": "section heading", "content": "explanation" }
  ],
  "conclusion": "2-3 sentence conclusion",
  "difficulty": "beginner or intermediate or advanced"
}

Lesson title: "${lessonTitle}"
Lesson content: ${trimmed}`

  try {
    // withJsonResponse asks for guaranteed JSON, and falls back to a plain call
    // (parsed by parseAiJson) if JSON mode itself errors.
    const completion = await withJsonResponse({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.3,
    })

    // Parse the AI's answer robustly (handles fences / stray prose).
    const summary = parseAiJson(completion.choices[0].message.content)
    return { success: true, summary }
  } catch (err) {
    // If anything failed (API error or bad JSON), return a safe placeholder so
    // the rest of the app keeps working instead of crashing.
    console.error('Groq generateSummary error:', err.message)
    return {
      success: false,
      summary: {
        title: lessonTitle,
        objectives: ['Review the original lesson for objectives'],
        keyPoints: [{ heading: 'Summary unavailable', content: 'Please try again.' }],
        conclusion: 'AI summary generation failed. Please try again.',
        difficulty: 'intermediate',
      },
      error: err.message,
    }
  }
}

// ─── CHAT WITH PDF ───────────────────────────────────
// messages = [{ role: 'user'|'assistant', content: '...' }]
// Answers one chat question, given the lesson text + recent conversation.
const chatWithPDF = async (lessonTitle, lessonText, messages) => {
  const trimmedLesson  = clampWords(lessonText, CHAT_LESSON_WORDS)   // trim the lesson
  const trimmedHistory = trimHistory(messages || [])                // trim the conversation

  // The "system prompt" sets the AI's role and rules (sent before the chat).
  const systemPrompt = `You are an intelligent academic assistant. You have read the following lesson document and must answer questions about it.

Lesson title: "${lessonTitle}"

Lesson content:
${trimmedLesson}

Rules:
- Answer only based on the lesson content above
- Be clear, concise, and helpful for university students
- When asked to generate a summary, produce a well-structured academic summary
- When asked for exam questions, generate relevant questions with clear answers
- When asked to explain something, use examples from the lesson
- Always respond in the same language the student uses`

  try {
    // Send: the system rules, then the trimmed back-and-forth so far.
    const completion = await withModelFallback({
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimmedHistory,
      ],
      max_tokens: 600,        // cap how long the reply can be
      temperature: 0.5,       // 0 = very focused, 1 = more creative
    })
    return completion.choices[0].message.content.trim()   // the AI's reply text
  } catch (err) {
    // Unlike the summary jobs, chat re-throws so the controller can show a
    // proper error card to the user.
    console.error('Groq chatWithPDF error:', err.message)
    throw new Error('AI chat failed: ' + err.message)
  }
}

// ─── GENERATE SUMMARY FROM CHAT ─────────────────────
// Called when student clicks "Generate Summary" inside the chat
// Same as generateSummary, but it ALSO feeds in the recent conversation so the
// summary reflects what the student was actually discussing.
const generateSummaryFromChat = async (lessonTitle, lessonText, chatHistory) => {
  const trimmedLesson  = clampWords(lessonText, SUMMARY_LESSON_WORDS)
  // Conversation context only adds value if there is one — and only the most
  // recent turns reflect what the student is currently asking about.
  const recentHistory  = trimHistory(chatHistory || [], 4)
  // Flatten the recent messages into a readable "Student: … / AI: …" transcript.
  const conversationContext = recentHistory
    .map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`)
    .join('\n')

  const prompt = `You are an academic assistant. Based on the lesson content and the conversation below, generate a structured summary.
Respond with ONLY valid JSON, no markdown, no backticks:
{
  "title": "lesson title",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "keyPoints": [
    { "heading": "section heading", "content": "explanation" }
  ],
  "conclusion": "2-3 sentence conclusion",
  "difficulty": "beginner or intermediate or advanced"
}

Lesson title: "${lessonTitle}"
Lesson content: ${trimmedLesson}

${conversationContext ? 'Conversation context:\n' + conversationContext : ''}`

  try {
    const completion = await withJsonResponse({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.3,
    })

    const summary = parseAiJson(completion.choices[0].message.content)   // robust parse
    return { success: true, summary }
  } catch (err) {
    console.error('Groq generateSummaryFromChat error:', err.message)
    return {
      success: false,
      summary: {
        title: lessonTitle,
        objectives: ['Review the original lesson for objectives'],
        keyPoints: [{ heading: 'Summary unavailable', content: 'Please try again.' }],
        conclusion: 'AI summary generation failed. Please try again.',
        difficulty: 'intermediate',
      },
    }
  }
}

// ─── GENERATE QUIZ (QCM) FROM DOCUMENT TEXT ─────────
// Returns { success, questions: [{ text, choices: [{ text, isCorrect }] }] }.
// Each question has exactly one correct choice. The result is normalized so
// callers never have to defend against a malformed model response.
//
// normalizeQuestions: clean up whatever shape the AI returned into our exact,
// trusted format. AI output can be slightly off, so we defensively fix it here.
const normalizeQuestions = (raw, numQuestions) => {
  if (!Array.isArray(raw)) return []
  const questions = []
  for (const q of raw) {
    const text = (q?.text || q?.question || '').toString().trim()   // accept "text" or "question"
    let choices = Array.isArray(q?.choices) ? q.choices : []
    // Accept either [{ text, isCorrect }] or { choices:[...], answer:"B" } shapes.
    choices = choices
      .map(c => ({
        text: (typeof c === 'string' ? c : c?.text || '').toString().trim(),
        isCorrect: !!(c && typeof c === 'object' && c.isCorrect),
      }))
      .filter(c => c.text)                          // drop empty choices
    if (!text || choices.length < 2) continue       // skip unusable questions
    // Guarantee exactly one correct answer.
    const correctCount = choices.filter(c => c.isCorrect).length
    if (correctCount !== 1) {
      choices = choices.map((c, i) => ({ ...c, isCorrect: i === 0 }))   // fix: mark the first as correct
    }
    questions.push({ text, choices: choices.slice(0, 6) })   // at most 6 choices
    if (questions.length >= numQuestions) break              // stop once we have enough
  }
  return questions
}

// The actual "make a quiz from this document" job.
const generateQuizFromText = async (title, text, numQuestions = 5) => {
  const n = Math.max(1, Math.min(Number(numQuestions) || 5, 20))   // clamp to 1–20 questions
  const trimmed = clampWords(text, QUIZ_LESSON_WORDS)

  // Need a reasonable amount of text to build questions from.
  if (!trimmed || trimmed.trim().length < 40) {
    return { success: false, questions: [], error: 'Not enough readable text in the document to build a quiz.' }
  }

  const prompt = `You are an academic assistant that writes multiple-choice (QCM) quizzes for university students.
Create exactly ${n} multiple-choice questions based ONLY on the document below.
Rules:
- Each question must have exactly 4 answer choices.
- Exactly ONE choice is correct.
- Questions must be answerable from the document content; do not invent facts.
- Vary difficulty and cover different parts of the document.
- Write in the same language as the document.

Respond with ONLY valid JSON, no markdown, no backticks, in this exact shape:
{
  "questions": [
    {
      "text": "question wording",
      "choices": [
        { "text": "choice A", "isCorrect": false },
        { "text": "choice B", "isCorrect": true },
        { "text": "choice C", "isCorrect": false },
        { "text": "choice D", "isCorrect": false }
      ]
    }
  ]
}

Document title: "${title || 'Untitled'}"
Document content: ${trimmed}`

  try {
    const completion = await withJsonResponse({
      messages: [{ role: 'user', content: prompt }],
      // More headroom so longer quizzes aren't cut off mid-JSON (truncated JSON
      // can't be parsed). ~250 tokens of JSON per question, plus a base buffer.
      max_tokens: Math.min(4000, 600 + n * 260),
      temperature: 0.4,
    })

    // Parse the AI's JSON robustly, then run it through normalizeQuestions.
    const parsed = parseAiJson(completion.choices[0].message.content)
    const questions = normalizeQuestions(parsed.questions || parsed, n)

    if (questions.length === 0) {
      return { success: false, questions: [], error: 'The AI could not produce questions from this document.' }
    }
    return { success: true, questions }
  } catch (err) {
    // Log the FULL reason to the backend terminal so it can be diagnosed.
    // (Groq attaches any partial output as err.error.failed_generation.)
    console.error('Groq generateQuizFromText error:', err.status || '', err.message)
    if (err?.error?.failed_generation) {
      console.error('  partial generation:', String(err.error.failed_generation).slice(0, 300))
    }
    // Show the user a friendly message — never leak the raw parser error
    // (e.g. "Unterminated fractional number in JSON…") into the UI.
    const friendly = isRateLimit(err)
      ? 'The AI is busy right now. Please wait a moment and try again.'
      : 'The AI returned an unexpected response. Please try generating again.'
    return { success: false, questions: [], error: friendly }
  }
}

// Expose the four AI jobs to the controllers that use them.
module.exports = { generateSummary, chatWithPDF, generateSummaryFromChat, generateQuizFromText }
