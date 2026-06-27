// ============================================================================
// shared/ChatPage.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the "Chat with a PDF" screen, shared by students and
// teachers. You pick a lesson, then chat with an AI about it. The AI can answer
// questions and produce a structured summary. Past conversations are saved in a
// side panel. Teachers can approve/publish a summary right from the chat.
//
// It's one big component (ChatPage) plus two small helper components
// (SummaryModal, SessionsPanel) and some error/format helpers at the top.
// ============================================================================

import { useState, useRef, useEffect, useMemo } from 'react'
import { lessonsAPI, chatAPI, summariesAPI } from '../../services/api'
import { useFetch } from '../../hooks/useFetch'
import ConfirmDialog from '../../components/common/ConfirmDialog'

// One-tap prompt buttons shown above the input box.
const QUICK_PROMPTS = [
  'Summarize this lesson',
  'Give me 5 exam questions',
  'Explain the key concepts',
  'What are the main objectives?',
  'Simplify this for me',
]

// Format "29m26.016s" → "29 min 26 s", "75s" → "1 min 15 s", etc.
// (Used to display how long until the AI's rate limit clears.)
function formatRetryAfter(s) {
  if (!s) return null
  const ms = s.match(/(\d+)m([\d.]+)s/i)
  if (ms) return `${ms[1]} min ${Math.round(parseFloat(ms[2]))} s`
  const sm = s.match(/(\d+)m/i)
  if (sm) return `${sm[1]} min`
  const ss = s.match(/([\d.]+)s/i)
  if (ss) {
    const total = Math.round(parseFloat(ss[1]))
    if (total >= 60) return `${Math.floor(total/60)} min ${total%60} s`
    return `${total} s`
  }
  return null
}

/**
 * Turn an axios error into a structured chat error.
 * Recognises Groq rate-limits (which arrive as a JSON-in-string blob
 * from the backend), timeouts, and generic failures.
 *
 * In plain terms: the AI can fail for different reasons (too many requests,
 * too slow, network down). This reads the raw error and returns a tidy object
 * { kind, title, detail, retryAfter } so the UI can show a friendly card.
 */
function parseAiError(err) {
  const status = err.response?.status
  const data   = err.response?.data
  const raw    = typeof data === 'string' ? data : (data?.message || data?.error?.message || '')

  // Backend sometimes sends "AI chat failed: 429 {...json...}" — try to peel
  // the JSON out so we can read the real reason and retry-after.
  let inner = null
  try {
    const m = raw.match(/\{[\s\S]*\}$/)
    if (m) inner = JSON.parse(m[0])?.error || null
  } catch { /* ignore */ }

  const reason = inner?.message || raw || err.message || ''
  const code   = inner?.code || ''

  // Rate limit (Groq TPD/RPM/TPM)
  if (status === 429 || code === 'rate_limit_exceeded' || /rate[-\s]?limit/i.test(reason)) {
    const retryRaw = (reason.match(/try again in ([\d.smh ]+)/i) || [])[1]
    const tier = (reason.match(/tokens? per (day|minute|hour)/i) || [])[1]
    const isMinute = tier === 'minute'
    const isDay = tier === 'day'
    return {
      kind: 'rate',
      title: isDay
        ? 'Daily AI quota reached'
        : isMinute
          ? 'AI is busy — short cooldown'
          : 'AI is rate-limiting requests',
      detail: isMinute
        ? 'The shared AI model hit its per-minute token limit. It usually clears in under a minute — wait, then retry.'
        : isDay
          ? 'The shared AI model has used up today\'s tokens for this account. Quota resets at midnight UTC.'
          : 'The shared AI model is rate-limiting requests right now.',
      retryAfter: formatRetryAfter(retryRaw),
    }
  }

  // Client-side / network timeout
  if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
    return {
      kind: 'timeout',
      title: 'Took too long to answer',
      detail: 'The model didn\'t respond in time. A shorter chat history or a more focused question usually helps.',
    }
  }

  // Network / server unreachable
  if (!err.response) {
    return {
      kind: 'error',
      title: 'Can\'t reach the server',
      detail: 'Check your connection and try again.',
    }
  }

  // Generic — surface the raw reason
  return {
    kind: 'error',
    title: 'Something went wrong',
    detail: reason || `Server returned ${status || 'an error'}.`,
  }
}

// ─── SUMMARY MODAL ───────────────────────────────────
// The popup that shows a generated summary in full (title, objectives, key
// points, conclusion). Same idea as the one in MySummaries.jsx.
function SummaryModal({ summary, onClose }) {
  if (!summary) return null
  // The summary may arrive as a JSON string or an object — normalize to object.
  const s = typeof summary === 'string' ? (() => { try { return JSON.parse(summary) } catch { return null } })() : summary
  if (!s) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 580, maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.25s ease', position: 'relative' }}>
        <button onClick={onClose} className="modal-close" aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>

        <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 12 }}>AI Summary</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 500, color: 'var(--text)', marginBottom: 22, lineHeight: 1.3, letterSpacing: '-0.02em' }}>{s.title}</div>

        {s.objectives?.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Learning Objectives</div>
            {s.objectives.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                <span style={{ color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{o}</span>
              </div>
            ))}
          </div>
        )}

        {s.keyPoints?.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Key Points</div>
            {s.keyPoints.map((kp, i) => (
              <div key={i} style={{ marginBottom: 12, padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>{kp.heading}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{kp.content}</div>
              </div>
            ))}
          </div>
        )}

        {s.conclusion && (
          <div style={{ padding: '14px 16px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 10 }}>
            <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 8 }}>Conclusion</div>
            <div style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.7, fontFamily: "'Playfair Display',serif", fontStyle: 'italic' }}>{s.conclusion}</div>
          </div>
        )}

        {s.difficulty && (
          <div style={{ marginTop: 16 }}>
            <span className={`badge ${s.difficulty === 'beginner' ? 'badge-green' : s.difficulty === 'advanced' ? 'badge-red' : 'badge-gold'}`}>
              {s.difficulty}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PAST SESSIONS PANEL ─────────────────────────────
// The left-hand list of saved conversations. Each row shows the lesson, a
// preview of the first question, and a delete button.
function SessionsPanel({ sessions, onSelect, onDelete, selectedSessionId }) {
  if (!sessions || sessions.length === 0) return (
    <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>No past conversations yet</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sessions.map(s => (
        <div
          key={s.id}
          onClick={() => onSelect(s)}
          className={`chat-session-row${selectedSessionId === s.id ? ' selected' : ''}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onSelect(s) }}
        >
          <i className="ti ti-bubble ti-message-circle" aria-hidden="true" style={{ fontSize: 16, color: 'var(--icon)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.lesson?.title}</div>
            {(() => {
              // First user message acts as the "title" for the conversation
              // (like ChatGPT/Claude do). Without this, three sessions about
              // the same lesson all read identically.
              const firstUserMsg = (s.messages || []).find(m => m.role === 'user')
              const preview = firstUserMsg?.content?.replace(/\s+/g, ' ').trim()
              return preview ? (
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                  {preview.length > 60 ? preview.slice(0, 60) + '…' : preview}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontStyle: 'italic' }}>Empty conversation</div>
              )
            })()}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, letterSpacing: '0.04em' }}>
              {s.messages?.length || 0} msg · {new Date(s.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button
            type="button"
            className="chat-session-del"
            aria-label={`Delete conversation about ${s.lesson?.title || 'this lesson'}`}
            title="Delete conversation"
            onClick={e => { e.stopPropagation(); onDelete(s.id) }}
          >
            <i className="ti ti-trash" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN CHAT PAGE ──────────────────────────────────
// Props: role ('STUDENT' or 'TEACHER'), and an optional lesson to open with.
export default function ChatPage({ role, preselectedLesson }) {
  const { data: lessons, loading: loadingLessons } = useFetch(() => lessonsAPI.getAll())     // lessons to choose from
  const { data: sessions, refetch: refetchSessions } = useFetch(() => chatAPI.getSessions()) // saved conversations

  // --- STATE ---------------------------------------------------------------
  const [search, setSearch] = useState('')                 // text in the lesson search box
  const [selectedLesson, setSelectedLesson] = useState(null)  // the lesson we're chatting about
  const [sessionId, setSessionId] = useState(null)         // server id of the current conversation
  const [messages, setMessages] = useState([])             // the visible chat messages
  const [input, setInput] = useState('')                   // text being typed
  const [sending, setSending] = useState(false)            // true while waiting for the AI's reply
  const [showDropdown, setShowDropdown] = useState(false)  // is the lesson search dropdown open?
  const [generatingSummary, setGeneratingSummary] = useState(false)  // true while a summary is being made
  const [approvingId, setApprovingId] = useState(null) // summaryCardId being approved/discarded
  const [openSummary, setOpenSummary] = useState(null) // summary data for modal
  const [showSessions, setShowSessions] = useState(() => // side panel open? (open by default on wide screens)
    typeof window !== 'undefined' ? window.innerWidth >= 769 : true
  )
  const [confirmDelete, setConfirmDelete] = useState(null) // session id pending deletion

  const messagesEndRef = useRef(null)                      // marker we scroll to so newest message shows
  const inputRef = useRef(null)                            // handle to the text box (to auto-focus it)
  const isStudent = role === 'STUDENT'

  // Context tag — bumps on every USER-initiated context switch (new lesson,
  // load past session, clear chat, new-chat-with-same-PDF).
  // sendMessage / generateSummary capture this tag at request start and
  // discard the response if it changed (i.e. user switched while AI was
  // "thinking"). Without this, replies from one chat leak into another.
  const contextTagRef = useRef(0)
  const bumpContext = () => { contextTagRef.current++ }

  // Null-safe filter — title/module may be undefined
  // (useMemo caches the result so we don't re-filter on every keystroke render.)
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (lessons || []).filter(l =>
      (l.title?.toLowerCase().includes(q)) ||
      (l.module?.name?.toLowerCase().includes(q))
    )
  }, [lessons, search])

  // Auto-scroll to the bottom whenever a new message is added.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Always start a fresh chat with a lesson. To resume a past conversation,
  // the user clicks it from the sessions sidebar (loadSession). This matches
  // how ChatGPT / Claude work and prevents the "I expected a new chat but
  // got my old one" surprise.
  const selectLesson = (lesson) => {
    bumpContext()
    setSelectedLesson(lesson)
    setSearch(lesson.title)
    setShowDropdown(false)
    setSessionId(null)
    setSending(false)
    setGeneratingSummary(false)
    setMessages([{
      role: 'assistant',
      system: true,
      content: `I've read **${lesson.title}** (${lesson.module?.name}). Ask me anything — I can summarize it, explain sections, generate exam questions, or answer specific questions.`,
    }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Start a brand-new chat with the currently selected PDF.
  // Old conversation stays accessible from the sessions sidebar.
  const newChatSamePdf = () => {
    if (!selectedLesson) return
    bumpContext()
    setSessionId(null)
    setSending(false)
    setGeneratingSummary(false)
    setMessages([{
      role: 'assistant',
      system: true,
      content: `Started a new chat about **${selectedLesson.title}**. Your previous conversation is saved in the side panel.`,
    }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Pre-select a lesson when arriving from another page (e.g. "Chat with this lesson")
  useEffect(() => {
    if (preselectedLesson && !selectedLesson) {
      selectLesson(preselectedLesson)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedLesson])

  // Open a saved conversation from the side panel and restore its messages.
  const loadSession = (session) => {
    bumpContext()
    setSelectedLesson(session.lesson)
    setSearch(session.lesson?.title || '')
    setSessionId(session.id)
    setSending(false)
    setGeneratingSummary(false)
    const restored = (session.messages || []).map(m => ({ role: m.role, content: m.content }))
    setMessages([
      { role: 'assistant', system: true, content: `Restored your conversation about **${session.lesson?.title}**. Continue where you left off!` },
      ...restored,
    ])
    setShowDropdown(false)
    setShowSessions(window.innerWidth >= 769)  // close mobile slide-over after selection
  }

  // Ask for confirmation before deleting (opens the ConfirmDialog).
  const deleteSession = (id) => setConfirmDelete(id)

  // Actually delete the conversation once the dialog is confirmed.
  const confirmDeleteSession = async () => {
    const id = confirmDelete
    if (!id) return
    try {
      await chatAPI.deleteSession(id)
      refetchSessions()
      if (sessionId === id) {
        bumpContext()
        setSessionId(null); setMessages([]); setSelectedLesson(null); setSearch('')
        setSending(false); setGeneratingSummary(false)
      }
    } catch (err) {
      // Surface failure so the user knows it didn't actually delete
      console.error('Delete session failed', err)
    } finally {
      setConfirmDelete(null)
    }
  }

  // sendMessage: add the user's message, call the AI, then append the reply.
  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || !selectedLesson || sending) return     // nothing to send / no lesson / already busy

    // Capture the context this request belongs to. If the user switches
    // (new lesson, loads a different session, starts a new chat) before the
    // response arrives, contextTagRef.current will have changed and we drop
    // the response — preventing it from leaking into the wrong chat.
    const myContext = contextTagRef.current
    const myLessonId = selectedLesson.id
    const mySessionId = sessionId

    const userMsg = { role: 'user', content }
    // Build the history to send: real messages only (drop system/error/summary cards).
    const chatHistory = [...messages.filter(m => !m.system && !m.error && m.content !== '__SUMMARY__' && m.content !== '__ERROR__'), userMsg]

    setMessages(prev => [...prev, userMsg])                 // show the user's message right away
    setInput('')                                            // clear the input box
    setSending(true)                                        // show the "Thinking…" indicator

    try {
      const res = await chatAPI.send(myLessonId, chatHistory, mySessionId)
      if (myContext !== contextTagRef.current) return  // user switched, drop reply

      const reply = res.data.reply
      const newSessionId = res.data.sessionId
      if (!mySessionId && newSessionId) {
        setSessionId(newSessionId)
        refetchSessions()
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      if (myContext !== contextTagRef.current) return  // stale error, drop

      const info = parseAiError(err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '__ERROR__',
        error: true,
        errorInfo: info,
        retryContent: content,
      }])
    } finally {
      if (myContext === contextTagRef.current) setSending(false)
    }
  }

  // Click-to-retry an errored message — drop the previous error card first
  const retryMessage = (text) => {
    setMessages(prev => prev.filter(m =>
      !(m.error && (m.retryContent === text || m.content === '__ERROR__'))
    ))
    sendMessage(text)
  }

  // generateSummary: ask the AI to turn the conversation into a structured
  // summary, then show it as a special card in the chat.
  const generateSummary = async () => {
    if (!selectedLesson) return

    const myContext = contextTagRef.current
    const myLessonId = selectedLesson.id
    setGeneratingSummary(true)

    const chatHistory = messages.filter(m =>
      !m.system && !m.error && m.content !== '__SUMMARY__' && m.content !== '__ERROR__'
    )

    try {
      const res = await summariesAPI.generate(myLessonId, { chatHistory })
      if (myContext !== contextTagRef.current) return  // user switched, drop
      const parsedContent = res.data.parsedContent
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '__SUMMARY__',
        summaryData: parsedContent,
        summaryId: res.data.summary?.id, // teachers approve/discard this draft inline
        submitted: false,
        summaryCardId: Date.now(),
      }])
    } catch (err) {
      if (myContext !== contextTagRef.current) return
      const info = parseAiError(err)
      // Slight tweak so the user knows this came from the summary action
      info.title = info.kind === 'rate'
        ? 'Daily AI quota reached'
        : `Couldn't generate summary — ${info.title.toLowerCase()}`
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '__ERROR__',
        error: true,
        errorInfo: info,
      }])
    } finally {
      if (myContext === contextTagRef.current) {
        setGeneratingSummary(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }

  // Teacher reviews their own AI-generated summary draft right in the chat.
  // Approve → published for students; Discard → rejected (hidden).
  const reviewSummaryCard = async (cardId, summaryId, action) => {
    if (!summaryId || approvingId) return
    setApprovingId(cardId)
    try {
      await summariesAPI.review(summaryId, { action })
      setMessages(prev => prev.map(m =>
        m.summaryCardId === cardId
          ? { ...m, reviewState: action === 'approve' ? 'approved' : 'discarded', reviewError: null }
          : m
      ))
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed — try again'
      setMessages(prev => prev.map(m => m.summaryCardId === cardId ? { ...m, reviewError: msg } : m))
    } finally {
      setApprovingId(null)
    }
  }

  // Close the lesson and reset everything back to the empty starting state.
  const clearChat = () => {
    bumpContext()
    setSelectedLesson(null)
    setSearch('')
    setMessages([])
    setSessionId(null)
    setShowDropdown(false)
    setSending(false)
    setGeneratingSummary(false)
  }

  // Tiny Markdown helper: turns **bold** text into actual bold (gold) spans.
  const renderBold = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)            // split on **...** keeping the delimiters
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} style={{ color: 'var(--gold)' }}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  // renderMessage: draw one chat message. A message can be a summary card, an
  // error card, or a normal text bubble — we branch on its content.
  const renderMessage = (msg, i) => {
    const isUser = msg.role === 'user'

    // ── Summary card ──
    if (msg.content === '__SUMMARY__' && msg.summaryData) {
      const s = msg.summaryData
      return (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={avatarStyle('ai')}>AI</div>
          <div style={{ maxWidth: '80%' }}>
            <div style={bubbleStyle('ai')}>Here's your structured summary:</div>
            <div
              onClick={() => setOpenSummary(s)}
              style={{ marginTop: 8, background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--success)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--success-border)'}>
              <div className="eyebrow" style={{ color: 'var(--success)', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-sparkles" aria-hidden="true" /> Summary ready — click to view
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{s.title}</div>
              {s.objectives?.slice(0, 2).map((o, j) => (
                <div key={j} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>• {o}</div>
              ))}
              {s.objectives?.length > 2 && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>+{s.objectives.length - 2} more objectives…</div>}
              {s.conclusion && <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 10 }}>{s.conclusion.slice(0, 120)}…</div>}

              {isStudent ? (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                  <i className="ti ti-check" aria-hidden="true" />Submitted to teacher for review — keep chatting.
                </div>
              ) : msg.reviewState === 'approved' ? (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                  <i className="ti ti-check" aria-hidden="true" />Published — students can now see this summary.
                </div>
              ) : msg.reviewState === 'discarded' ? (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                  <i className="ti ti-x" aria-hidden="true" />Discarded — not published.
                </div>
              ) : (
                <div onClick={e => e.stopPropagation()} style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => reviewSummaryCard(msg.summaryCardId, msg.summaryId, 'approve')}
                    disabled={approvingId === msg.summaryCardId || !msg.summaryId}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--success)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: approvingId === msg.summaryCardId ? 0.6 : 1 }}
                  >
                    {approvingId === msg.summaryCardId
                      ? <><span className="spinner" style={{ width: 10, height: 10 }} />Publishing…</>
                      : <><i className="ti ti-check" aria-hidden="true" />Approve &amp; publish</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewSummaryCard(msg.summaryCardId, msg.summaryId, 'reject')}
                    disabled={approvingId === msg.summaryCardId || !msg.summaryId}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <i className="ti ti-x" aria-hidden="true" />Discard
                  </button>
                  {msg.reviewError && <span style={{ fontSize: 11, color: 'var(--brick)' }}>{msg.reviewError}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // ── Structured error card (rate-limit, timeout, generic) ──
    if (msg.content === '__ERROR__' && msg.errorInfo) {
      const info = msg.errorInfo
      const icon = info.kind === 'rate' ? 'ti-hourglass' : info.kind === 'timeout' ? 'ti-clock' : 'ti-alert-triangle'
      return (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={avatarStyle('ai')}>AI</div>
          <div className={`chat-err-card kind-${info.kind}`} role="alert">
            <i className={`ti ${icon} chat-err-icon`} aria-hidden="true" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-err-title">{info.title}</div>
              <div className="chat-err-detail">{info.detail}</div>
              {info.retryAfter && (
                <div className="chat-err-meta">Try again in {info.retryAfter}.</div>
              )}
              <div className="chat-err-actions">
                {msg.retryContent && (
                  <button type="button" className="chat-err-btn primary"
                          onClick={() => retryMessage(msg.retryContent)}>
                    <i className="ti ti-refresh" aria-hidden="true" />Retry now
                  </button>
                )}
                {info.kind === 'rate' && (
                  <a className="chat-err-btn"
                     href="https://console.groq.com/settings/billing"
                     target="_blank" rel="noopener noreferrer">
                    Upgrade tier <i className="ti ti-external-link" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ── Regular message ──
    return (
      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <div style={avatarStyle(isUser ? 'user' : 'ai')}>{isUser ? <i className="ti ti-user" aria-hidden="true" /> : 'AI'}</div>
        <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          <div style={bubbleStyle(isUser ? 'user' : 'ai')}>
            {renderBold(msg.content)}
          </div>
        </div>
      </div>
    )
  }

  // --- RENDER: side panel + main chat area ---------------------------------
  return (
    <>
      {/* The full-summary popup (only when a summary card was clicked). */}
      {openSummary && <SummaryModal summary={openSummary} onClose={() => setOpenSummary(null)} />}

      {/* "Delete this conversation?" confirmation. */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this conversation?"
        message="This cannot be undone."
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteSession}
      />

      <div style={{ display: 'flex', height: 'calc(100dvh - 60px)', overflow: 'hidden' }}>

        {/* Mobile backdrop for the slide-over */}
        <div
          className={`chat-sessions-backdrop${showSessions ? ' visible' : ''}`}
          onClick={() => setShowSessions(false)}
          aria-hidden="true"
        />

        {/* ── Past sessions sidebar (slide-over on mobile) ── */}
        <div
          className={`chat-sessions-panel${showSessions ? ' open' : ''}`}
          style={{ width: showSessions ? 240 : 0 }}
        >
          <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Past chats</span>
            <button onClick={() => { clearChat() }} style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>+ New</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
            <SessionsPanel
              sessions={sessions}
              onSelect={loadSession}
              onDelete={deleteSession}
              selectedSessionId={sessionId}
            />
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header with lesson selector */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setShowSessions(v => !v)} title="Toggle history" aria-label="Toggle past chats"
                style={{ width: 38, height: 38, background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, flexShrink: 0, color: 'var(--text2)' }}>
                <i className={`ti ${showSessions ? 'ti-layout-sidebar-left-collapse' : 'ti-layout-sidebar-left-expand'}`} aria-hidden="true" />
              </button>
              <div style={{ position: 'relative', flex: 1, maxWidth: 520 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: `1px solid ${selectedLesson ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 10, padding: '0 12px', height: 42, transition: 'all 0.2s' }}>
                  <i className={`ti ${selectedLesson ? 'ti-file-text' : 'ti-search'}`} aria-hidden="true" style={{ color: selectedLesson ? 'var(--gold)' : 'var(--icon)', fontSize: 16 }} />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) setSelectedLesson(null) }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search for a lesson to chat with…"
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--text)', flex: 1, height: '100%' }}
                  />
                  {selectedLesson && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{selectedLesson.module?.name}</span>}
                  {selectedLesson && (
                    <button
                      type="button"
                      className="chat-newchat"
                      onClick={newChatSamePdf}
                      title="Start a fresh conversation about this PDF (your current chat will stay in the side panel)"
                    >
                      <i className="ti ti-plus" aria-hidden="true" />New chat
                    </button>
                  )}
                  {selectedLesson && (
                    <button
                      type="button"
                      onClick={clearChat}
                      aria-label="Close lesson"
                      title="Close lesson"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: 4, display: 'inline-flex', alignItems: 'center' }}
                    ><i className="ti ti-x" aria-hidden="true" /></button>
                  )}
                </div>
                {showDropdown && search && !selectedLesson && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: 280, overflowY: 'auto' }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding: 16, fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>No lessons found</div>
                    ) : filtered.slice(0, 8).map(l => (
                      <div key={l.id} onClick={() => selectLesson(l)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-dim)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <i className={`ti ${l.fileType === 'PDF' ? 'ti-file-text' : l.fileType === 'DOCX' ? 'ti-file-description' : 'ti-presentation'}`} aria-hidden="true" style={{ fontSize: 18, color: 'var(--icon)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, letterSpacing: '0.04em' }}>{l.module?.name} · {l.teacher?.firstName} {l.teacher?.lastName}</div>
                        </div>
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>{l.fileType}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Empty state (no lesson chosen yet) vs. the live chat. */}
          {!selectedLesson ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 32 }} onClick={() => setShowDropdown(false)}>
              <i className="ti ti-message-circle-2" aria-hidden="true" style={{ fontSize: 48, color: 'var(--icon)', opacity: 0.6 }} />
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: 'var(--text)', letterSpacing: '-0.02em', fontWeight: 500 }}>Chat with a <em style={{ color: 'var(--gold)', fontWeight: 500 }}>lesson</em></div>
              <div style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', maxWidth: 380, lineHeight: 1.6 }}>
                Search for a lesson above, or pick a past conversation from the left panel.
              </div>
              {loadingLessons && <div className="spinner" style={{ marginTop: 12 }} />}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}
                onClick={() => setShowDropdown(false)}>
                {messages.map((msg, i) => renderMessage(msg, i))}
                {sending && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={avatarStyle('ai')}>AI</div>
                    <div style={{ ...bubbleStyle('ai'), display: 'inline-flex', gap: 9, alignItems: 'center' }}>
                      <span className="spinner" />
                      <span style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', fontFamily: "'Playfair Display',serif" }}>Thinking</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {QUICK_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => sendMessage(p)} disabled={sending}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, color: 'var(--text2)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', fontWeight: 500 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-dim)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent' }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={generateSummary} disabled={generatingSummary || sending} className="chat-newchat" style={{ opacity: generatingSummary ? 0.6 : 1 }}>
                    {generatingSummary ? <><span className="spinner" style={{ width: 10, height: 10 }} />Generating</> : <><i className="ti ti-sparkles" aria-hidden="true" />Generate Summary</>}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, background: 'var(--field-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendMessage() } }}
                      placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                      style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 14, color: 'var(--text)', resize: 'none', minHeight: 44, maxHeight: 120, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}
                      rows={1}
                    />
                  </div>
                  <button onClick={() => sendMessage()} disabled={!input.trim() || sending} aria-label="Send message"
                    style={{ width: 46, height: 46, background: 'var(--gold)', border: 'none', borderRadius: 10, color: 'var(--surface)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !input.trim() || sending ? 0.5 : 1, transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (input.trim() && !sending) e.currentTarget.style.background = 'var(--gold2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)' }}>
                    <i className="ti ti-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// --- Shared inline styles for the chat bubbles (defined once, reused) -------
// avatarStyle: the little round "AI" / user icon next to each message.
const avatarStyle = (type) => ({
  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontSize: type === 'ai' ? 11 : 14, fontWeight: 500,
  flexShrink: 0, marginTop: 2,
  background: type === 'ai' ? 'var(--gold)' : 'var(--surface2)',
  border: type === 'ai' ? 'none' : '1px solid var(--border)',
  color: type === 'ai' ? 'var(--surface)' : 'var(--text2)',
  letterSpacing: '0.04em',
})

// bubbleStyle: the message bubble itself — gold-tinted for the user, plain for AI.
const bubbleStyle = (type) => ({
  padding: '11px 15px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.7,
  background: type === 'user' ? 'var(--gold-dim)' : 'var(--surface)',
  border: '1px solid ' + (type === 'user' ? 'var(--gold-border)' : 'var(--border)'),
  color: 'var(--text)',
  borderBottomLeftRadius: type === 'ai' ? 3 : 12,
  borderBottomRightRadius: type === 'user' ? 3 : 12,
  whiteSpace: 'pre-wrap',
})

