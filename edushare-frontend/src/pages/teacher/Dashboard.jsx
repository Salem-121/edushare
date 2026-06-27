// ============================================================================
// teacher/Dashboard.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the entire TEACHER area. A teacher can upload lessons,
// manage them, review the AI summaries students submit, chat with a PDF, and
// create/grade quizzes (including AI-generated ones).
//
// Like the admin file, it's built from several sub-page components, with a ROOT
// component at the very bottom that swaps between them based on the active tab.
// ============================================================================

import { useState, useRef } from 'react'
import { Sidebar, Topbar } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'
import { useFetch } from '../../hooks/useFetch'
import { useHashPage } from '../../hooks/useHashPage'
import { lessonsAPI, modulesAPI, summariesAPI, chatAPI, quizzesAPI, filieresAPI } from '../../services/api'
import ChatPage from '../shared/ChatPage'                          // shared "chat with a PDF" screen
import ConfirmDialog from '../../components/common/ConfirmDialog'

// --- File-upload rules, shared by the upload + quiz-generate screens ---------
const ACCEPT_EXT = ['pdf', 'docx', 'pptx']         // file types we accept
const MAX_BYTES  = 50 * 1024 * 1024                // 50 MB size cap
// Turn a lesson title into a safe download filename (strip odd characters).
const safeFilename = (name) => (name || 'lesson').replace(/[^\w\s.-]/g, '_').trim() || 'lesson'

// Pick a greeting based on the current hour of the day.
const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── DASHBOARD HOME ──────────────────────────────────
// The landing tab: greeting, stat cards, quick-action buttons, recent lessons.
function TeacherHome({ setPage, lessons, pending, sessionsCount, totalSummaries, quizzesCount, firstName }) {
  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title">{greeting()}{firstName ? <>, <em>{firstName}</em></> : ''}</div>
        <div className="page-sub">Here's your teaching overview.</div>
      </div>
      <div className="stats-grid">
        {[
          { icon: 'ti-books',          val: lessons?.length || 0, label: 'My Lessons',      page: 'teacher-lessons' },
          { icon: 'ti-checklist',      val: quizzesCount,         label: 'My Quizzes',      page: 'teacher-quizzes' },
          { icon: 'ti-eye-check',      val: pending?.length || 0, label: 'Pending Reviews', page: 'teacher-reviews' },
          { icon: 'ti-message-circle', val: sessionsCount,        label: 'Chat Sessions',   page: 'teacher-chat' },
          { icon: 'ti-notebook',       val: totalSummaries,       label: 'Total Summaries' },
        ].map((s) => s.page ? (
          <button
            key={s.label}
            type="button"
            className="stat-card-btn"
            onClick={() => setPage(s.page)}
            aria-label={`${s.label}: ${s.val}. Open ${s.label}.`}
          >
            <div className="stat-card">
              <div className="stat-icon"><i className={`ti ${s.icon}`} aria-hidden="true" /></div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-hint">Open <i className="ti ti-arrow-right" aria-hidden="true" style={{ fontSize: 11 }} /></div>
            </div>
          </button>
        ) : (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon"><i className={`ti ${s.icon}`} aria-hidden="true" /></div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="two-col">
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Quick Actions</div>
          {[
            { icon: 'ti-upload',           label: 'Upload New Lesson', sub: 'Share materials with students',  action: 'teacher-upload' },
            { icon: 'ti-sparkles',         label: 'Create a Quiz',     sub: 'Generate from a PDF or build by hand', action: 'teacher-quiz-create' },
            { icon: 'ti-message-circle',   label: 'Chat with PDF',     sub: 'Ask questions about any lesson', action: 'teacher-chat' },
            { icon: 'ti-eye-check',        label: 'Review Summaries',  sub: `${pending?.length || 0} pending`, action: 'teacher-reviews', badge: pending?.length },
            { icon: 'ti-clipboard-list',   label: 'Manage My Lessons', sub: 'Edit or delete your lessons',    action: 'teacher-lessons' },
          ].map((a) => (
            <button key={a.action} onClick={() => setPage(a.action)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%', marginBottom: 10 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.background = 'var(--gold-dim)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--gold)', flexShrink: 0 }}>
                <i className={`ti ${a.icon}`} aria-hidden="true" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.sub}</div>
              </div>
              {a.badge > 0 && <span className="nav-badge">{a.badge}</span>}
              <i className="ti ti-arrow-right" aria-hidden="true" style={{ color: 'var(--text3)', fontSize: 16 }} />
            </button>
          ))}
        </div>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Recent Lessons</div>
          {(lessons || []).slice(0, 4).map((l, i) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: i < 3 ? '1px solid var(--border)' : 'none', marginBottom: i < 3 ? 12 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--icon)', fontSize: 16, flexShrink: 0 }}>
                <i className={`ti ${l.fileType === 'PDF' ? 'ti-file-text' : l.fileType === 'DOCX' ? 'ti-file-description' : 'ti-presentation'}`} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, letterSpacing: '0.06em' }}>{l.module?.name}</div>
              </div>
              <span className="badge badge-success"><i className="ti ti-check" aria-hidden="true" style={{ fontSize: 11 }} />Live</span>
            </div>
          ))}
          {(!lessons || lessons.length === 0) && (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <i className="ti ti-book-off empty-icon" aria-hidden="true" />
              <div className="empty-text">Nothing here yet. Upload your first lesson to begin.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── UPLOAD LESSON (module typed, not dropdown) ──────
// A form to upload a new lesson file. The teacher types a module name (with
// autocomplete); if it doesn't exist yet, we create it automatically.
function UploadLesson({ onUploaded }) {
  const [form, setForm] = useState({ title: '', description: '', moduleName: '' })  // text fields
  const [file, setFile] = useState(null)            // the chosen file object
  const [dragging, setDragging] = useState(false)   // true while a file is being dragged over the drop zone
  const [uploading, setUploading] = useState(false) // true while the upload runs
  const [done, setDone] = useState(false)           // true once upload succeeds (shows the success screen)
  const [error, setError] = useState('')
  const fileRef = useRef()                           // handle to the hidden <input type=file>
  const { data: modules } = useFetch(() => modulesAPI.getAll())  // existing modules, for autocomplete

  // Suggestions for autocomplete
  // (Modules whose name contains what's typed, excluding an exact match.)
  const suggestions = (modules || []).filter(m =>
    form.moduleName.length > 0 &&
    m.name.toLowerCase().includes(form.moduleName.toLowerCase()) &&
    m.name.toLowerCase() !== form.moduleName.toLowerCase()
  )

  // Validate a picked/dropped file before accepting it (type + size).
  const handleFile = (f) => {
    if (!f) return
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (!ACCEPT_EXT.includes(ext)) { setError(`Unsupported file type: .${ext}`); return }
    if (f.size > MAX_BYTES)        { setError('File too large (max 50 MB)'); return }
    setError(''); setFile(f)
  }

  // submit: validate, ensure the module exists, then upload the file.
  const submit = async () => {
    if (!form.title || !form.moduleName || !file) { setError('Title, module name and file are required'); return }

    setUploading(true); setError('')
    try {
      // Find module by name (case insensitive)
      let matchedModule = (modules || []).find(m =>
        m.name.toLowerCase() === form.moduleName.toLowerCase()
      )

      // Create on-the-fly if it doesn't exist (better UX than blocking upload)
      if (!matchedModule) {
        const code = form.moduleName.toUpperCase().replace(/\W+/g, '').slice(0, 8) || 'MOD'
        try {
          const created = await modulesAPI.create({ name: form.moduleName, code, description: '' })
          matchedModule = created.data
        } catch (e) {
          setError(e.response?.data?.message || `Could not create module "${form.moduleName}"`)
          setUploading(false); return
        }
      }

      // FormData is how files are sent over HTTP. We attach each field + the file.
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('moduleId', matchedModule.id)
      fd.append('file', file)
      await lessonsAPI.create(fd)
      setDone(true)                                   // show the success screen
      if (onUploaded) onUploaded()                    // let the parent refresh its lesson list
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  // After a successful upload, show a confirmation screen instead of the form.
  if (done) return (
    <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--gold)', margin: '0 auto 24px' }}>
          <i className="ti ti-check" aria-hidden="true" />
        </div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.02em' }}>Your lesson is <em style={{ color: 'var(--gold)' }}>on the shelf</em>.</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.6 }}>Students can find it in the catalog from this moment on.</div>
        <button className="btn btn-primary" onClick={() => { setForm({ title: '', description: '', moduleName: '' }); setFile(null); setDone(false) }}>
          <i className="ti ti-upload" aria-hidden="true" />Upload another
        </button>
      </div>
    </div>
  )

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title">Upload Lesson</div>
        <div className="page-sub">Share educational materials with your students</div>
      </div>
      <div style={{ maxWidth: 640 }}>
        <div className="card">
          {error && <div className="alert-error"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>{error}</span></div>}

          <div className="field">
            <label className="field-label">Lesson Title *</label>
            <input className="field-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Introduction to Quadratic Equations" />
          </div>

          <div className="field">
            <label className="field-label">Description</label>
            <textarea className="field-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief overview of what this lesson covers…" style={{ minHeight: 80 }} />
          </div>

          {/* Module name — typed input with autocomplete */}
          <div className="field" style={{ position: 'relative' }}>
            <label className="field-label">Module Name *</label>
            <input
              className="field-input"
              value={form.moduleName}
              onChange={e => setForm(p => ({ ...p, moduleName: e.target.value }))}
              placeholder="e.g. Mathematics, Physics, Computer Science…"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginTop: 4 }}>
                {suggestions.map(m => (
                  <div key={m.id} onClick={() => setForm(p => ({ ...p, moduleName: m.name }))}
                    style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 9 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <i className="ti ti-book-2" aria-hidden="true" style={{ color: 'var(--icon)', fontSize: 15 }} />
                    <span>{m.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto', letterSpacing: '0.08em' }}>{m.code}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              Available: {(modules || []).map(m => m.name).join(', ')}
            </div>
          </div>

          {/* File drop zone */}
          <div className="field">
            <label className="field-label">File *</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
              onClick={() => fileRef.current.click()}
              style={{ border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragging ? 'var(--gold-dim)' : 'var(--surface2)' }}>
              {file ? (
                <div>
                  <i className="ti ti-file-text" aria-hidden="true" style={{ fontSize: 36, color: 'var(--gold)', display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <button className="btn btn-neutral btn-sm" style={{ marginTop: 14 }} onClick={e => { e.stopPropagation(); setFile(null) }}>
                    <i className="ti ti-x" aria-hidden="true" />Remove
                  </button>
                </div>
              ) : (
                <div>
                  <i className="ti ti-cloud-upload" aria-hidden="true" style={{ fontSize: 38, color: 'var(--icon)', display: 'block', marginBottom: 14 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Drop your file here, or click to browse</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>PDF, DOCX, PPTX — up to 50 MB</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".pdf,.docx,.pptx" onChange={e => handleFile(e.target.files?.[0])} />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={submit} disabled={uploading || !form.title || !form.moduleName || !file}>
            {uploading ? <><span className="spinner" />Uploading</> : <>Upload lesson <i className="ti ti-arrow-right" aria-hidden="true" /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MY LESSONS ──────────────────────────────────────
// A table of the teacher's own lessons with edit, delete, and download actions.
function MyLessons() {
  const { data: lessons, loading, refetch } = useFetch(() => lessonsAPI.getMy())
  const { data: modules } = useFetch(() => modulesAPI.getAll())
  const [modal, setModal] = useState(null)            // the lesson being edited (null = closed)
  const [form, setForm] = useState({ title: '', moduleId: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)  // lesson pending deletion
  const [toast, setToast] = useState(null)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // save: push the edited title/module back to the server.
  const save = async () => {
    setSaving(true)
    try {
      await lessonsAPI.update(modal.id, form)
      setModal(null); refetch()
      showToast('Lesson updated')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update', false)
    } finally { setSaving(false) }
  }

  const doDelete = async () => {
    const lesson = confirmDel
    if (!lesson) return
    try {
      await lessonsAPI.delete(lesson.id); refetch()
      showToast('Lesson deleted')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', false)
    } finally { setConfirmDel(null) }
  }

  // download: fetch the file bytes and trigger a browser download.
  // (The trick: build a temporary <a> link, click it, then clean up.)
  const download = async (l) => {
    try {
      const res = await lessonsAPI.download(l.id)                    // get the raw file (a "blob")
      const url = URL.createObjectURL(new Blob([res.data]))          // make a temporary in-memory URL
      const a = document.createElement('a'); a.href = url
      a.download = `${safeFilename(l.title)}.${l.fileType.toLowerCase()}`; a.click()  // name it + click it
      URL.revokeObjectURL(url)                                       // free the temporary URL
    } catch (err) {
      showToast(err.response?.data?.message || 'Download failed', false)
    }
  }

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title">My Lessons</div>
        <div className="page-sub">{(lessons || []).length} lessons uploaded</div>
      </div>
      {loading ? <div className="spinner spinner-lg" /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Module</th><th>Type</th><th>Size</th><th>Summaries</th><th>Actions</th></tr></thead>
            <tbody>
              {(lessons || []).map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text)' }}>{l.title}</td>
                  <td><span className="badge badge-blue">{l.module?.name}</span></td>
                  <td><span className="badge badge-gray">{l.fileType}</span></td>
                  <td>{(l.fileSize / 1024 / 1024).toFixed(1)} MB</td>
                  <td>{l._count?.summaries || 0}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-neutral btn-sm" onClick={() => download(l)} title="Download" aria-label="Download lesson">
                        <i className="ti ti-download" aria-hidden="true" />
                      </button>
                      <button className="btn btn-neutral btn-sm" onClick={() => { setForm({ title: l.title, moduleId: l.moduleId }); setModal(l) }} title="Edit" aria-label="Edit lesson">
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(l)} title="Delete" aria-label="Delete lesson">
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
            <div className="modal-title">Edit Lesson</div>
            <div className="field"><label className="field-label">Title</label>
              <input className="field-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="field"><label className="field-label">Module</label>
              <select className="field-input" value={form.moduleId} onChange={e => setForm(f => ({ ...f, moduleId: Number(e.target.value) }))}>
                {(modules || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select></div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this lesson?"
        message={confirmDel ? `"${confirmDel.title}" will be permanently removed along with all summaries.` : ''}
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      {toast && (
        <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`} role="status"><i className={`ti ${toast.ok ? 'ti-check' : 'ti-alert-triangle'}`} aria-hidden="true" /><span>{toast.msg}</span></div>
      )}
    </div>
  )
}

// ─── REVIEW SUMMARIES ────────────────────────────────
// Teachers approve or reject the AI summaries students submit. Each card can be
// expanded to preview the summary, and the teacher can add optional feedback.
function ReviewSummaries() {
  const { data: reviews, loading, refetch } = useFetch(() => summariesAPI.getPending())
  const [localReviews, setLocalReviews] = useState(null)   // optimistic copy (see `act` below)
  const [expanded, setExpanded] = useState(null)           // which card's preview is open
  const [feedback, setFeedback] = useState({})             // feedback text, keyed by summary id
  const [acting, setActing] = useState(null)               // id currently being approved/rejected
  const [toast, setToast] = useState(null)

  // Prefer our optimistic local copy if we have one; otherwise the server data.
  const displayReviews = localReviews ?? reviews ?? []

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // act: approve or reject a summary.
  // This uses an "optimistic update" — we remove the card from the list
  // immediately so the UI feels instant, and only roll back if the server fails.
  const act = async (id, action) => {
    setActing(id)
    const snapshot = localReviews ?? reviews ?? []
    setLocalReviews(snapshot.filter(r => r.id !== id))     // optimistically drop it from the list
    try {
      await summariesAPI.review(id, { action, feedback: feedback[id] || '' })
      showToast(action === 'approve' ? 'Summary approved — student notified' : 'Summary rejected — student notified')
    } catch {
      setLocalReviews(null)                                 // undo: fall back to server data
      refetch()
      showToast('Failed to submit review — please try again', false)
    } finally { setActing(null) }
  }

  // The summary is stored as a JSON string; parse it (or null if it's broken).
  const parseContent = (content) => {
    try { return JSON.parse(content) } catch { return null }
  }

  return (
    <div className="content">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`} role="status">
          <i className={`ti ${toast.ok ? 'ti-check' : 'ti-alert-triangle'}`} aria-hidden="true" />
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="page-header">
        <div className="page-title">Review Summaries</div>
        <div className="page-sub">{displayReviews.length} pending submission{displayReviews.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? <div className="spinner spinner-lg" /> : displayReviews.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-checks empty-icon" aria-hidden="true" />
          <div className="empty-text">All caught up. The reading desk is clear.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayReviews.map(r => {
            const parsed = parseContent(r.content)
            return (
              <div key={r.id} className="card">
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.user?.firstName} {r.user?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>submitted {new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="badge badge-neutral">{r.lesson?.title}</span>
                      {r.lesson?.module?.name && <span className="badge badge-gray">{r.lesson.module.name}</span>}
                      <span className="badge badge-gold"><i className="ti ti-hourglass" aria-hidden="true" style={{ fontSize: 11 }} />Pending Review</span>
                    </div>
                  </div>
                  <button className="btn btn-neutral btn-sm" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <i className={`ti ${expanded === r.id ? 'ti-chevron-up' : 'ti-eye'}`} aria-hidden="true" />
                    {expanded === r.id ? 'Hide' : 'Preview'}
                  </button>
                </div>

                {/* Expandable preview */}
                {expanded === r.id && parsed && (
                  <div style={{ marginTop: 16, padding: '16px 18px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{parsed.title}</div>
                    {parsed.objectives?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>Objectives</div>
                        {parsed.objectives.map((o, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 3 }}>• {o}</div>)}
                      </div>
                    )}
                    {parsed.keyPoints?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>Key Points</div>
                        {parsed.keyPoints.map((kp, i) => (
                          <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 3 }}><strong style={{ color: 'var(--text)' }}>{kp.heading}:</strong> {kp.content}</div>
                        ))}
                      </div>
                    )}
                    {parsed.conclusion && <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>{parsed.conclusion}</div>}
                  </div>
                )}

                {/* Feedback + action buttons */}
                <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label className="field-label" style={{ marginBottom: 6 }}>Feedback for student (optional)</label>
                    <textarea className="field-input" style={{ minHeight: 56 }} placeholder="Explain your decision or suggest improvements…"
                      value={feedback[r.id] || ''} onChange={e => setFeedback(f => ({ ...f, [r.id]: e.target.value }))} />
                  </div>
                  <div className="row-actions" style={{ paddingBottom: 2 }}>
                    <button className="btn btn-success" onClick={() => act(r.id, 'approve')} disabled={acting === r.id}>
                      {acting === r.id ? <span className="spinner" /> : <><i className="ti ti-check" aria-hidden="true" />Approve</>}
                    </button>
                    <button className="btn btn-danger" onClick={() => act(r.id, 'reject')} disabled={acting === r.id}>
                      <i className="ti ti-x" aria-hidden="true" />Reject
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── QUIZZES (LIST) ──────────────────────────────────
// A grid of the teacher's quizzes. Each card links to its results, or can be
// deleted. The "New quiz" button switches to the QuizCreate sub-page.
function TeacherQuizzes({ setPage, setSelectedQuiz }) {
  const { data: quizzes, loading, refetch } = useFetch(() => quizzesAPI.getAll())
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const doDelete = async () => {
    const q = confirmDel
    if (!q) return
    try {
      await quizzesAPI.delete(q.id); refetch()
      showToast('Quiz deleted')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', false)
    } finally { setConfirmDel(null) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title">My Quizzes</div>
        <div className="page-sub">QCM tests you've published for students</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => setPage('teacher-quiz-create')}>
          <i className="ti ti-plus" aria-hidden="true" />New quiz
        </button>
      </div>
      {loading ? <div className="spinner spinner-lg" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {(quizzes || []).map(q => (
            <div key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--gold)' }}>
                  <i className="ti ti-checklist" aria-hidden="true" />
                </div>
                <span className="badge badge-gray">{q.timeLimit} min</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 500, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{q.title}</div>
              {q.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>{q.description}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {q.filieres?.map(qf => (
                  <span key={qf.filiere.id} className="badge badge-neutral">{qf.filiere.code}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 14 }}>
                <span><i className="ti ti-help" aria-hidden="true" /> {q._count?.questions || 0} questions</span>
                <span><i className="ti ti-users" aria-hidden="true" /> {q._count?.attempts || 0} attempts</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedQuiz(q); setPage('teacher-quiz-results') }}>
                  <i className="ti ti-chart-bar" aria-hidden="true" />Results
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(q)} aria-label="Delete quiz">
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {(quizzes || []).length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <i className="ti ti-checklist empty-icon" aria-hidden="true" />
              <div className="empty-text">No quizzes yet. Create your first QCM test to assess students.</div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this quiz?"
        message={confirmDel ? `"${confirmDel.title}" and all student attempts will be permanently removed.` : ''}
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      {toast && <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`} role="status"><i className={`ti ${toast.ok ? 'ti-check' : 'ti-alert-triangle'}`} aria-hidden="true" /><span>{toast.msg}</span></div>}
    </div>
  )
}

// ─── QUIZ CREATE ─────────────────────────────────────
// The quiz builder. Two ways to fill it: (1) drop a PDF/DOCX and let the AI
// draft questions, or (2) type questions and choices by hand. Either way the
// teacher reviews everything, targets one or more filières, then publishes.
function QuizCreate({ setPage }) {
  const { data: filieres } = useFetch(() => filieresAPI.getAll())
  // --- Quiz details + the editable list of questions -----------------------
  const [meta, setMeta] = useState({ title: '', description: '', timeLimit: 20 })  // top-level quiz info
  const [filiereIds, setFiliereIds] = useState([])     // which filières this quiz targets
  // A question = { text, choices }. A choice = { text, isCorrect }.
  // We start with one blank question that has 4 empty choices (first marked correct).
  const [questions, setQuestions] = useState([
    { text: '', choices: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // AI generation from a dropped PDF/DOCX.
  const [genFile, setGenFile] = useState(null)         // file to generate from
  const [genCount, setGenCount] = useState(5)          // how many questions to ask the AI for
  const [genDragging, setGenDragging] = useState(false)
  const [generating, setGenerating] = useState(false)  // true while the AI works
  const [genNotice, setGenNotice] = useState('')       // success note after generation
  const genFileRef = useRef()

  // Validate a file chosen for AI generation (PDF/DOCX only, size cap).
  const pickGenFile = (f) => {
    if (!f) return
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) { setError('AI generation supports PDF or DOCX files'); return }
    if (f.size > MAX_BYTES) { setError('File too large (max 50 MB)'); return }
    setError(''); setGenNotice(''); setGenFile(f)
  }

  // generate: send the file to the AI and load the returned questions into the form.
  const generate = async () => {
    if (!genFile) { setError('Drop a PDF or DOCX file to generate from'); return }
    setGenerating(true); setError(''); setGenNotice('')
    try {
      const fd = new FormData()
      fd.append('file', genFile)
      fd.append('numQuestions', String(genCount))
      if (meta.title.trim()) fd.append('title', meta.title.trim())
      const res = await quizzesAPI.generate(fd)
      const generated = (res.data.questions || []).map(q => ({
        text: q.text,
        choices: q.choices.map(c => ({ text: c.text, isCorrect: !!c.isCorrect })),
      }))
      if (generated.length === 0) { setError('The AI could not build questions from that file. Try another document.'); return }
      setQuestions(generated)
      if (!meta.title.trim() && res.data.title) setMeta(m => ({ ...m, title: res.data.title }))
      setGenNotice(`${generated.length} question${generated.length !== 1 ? 's' : ''} generated — review and edit below, then publish.`)
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed. Please try again.')
    } finally { setGenerating(false) }
  }

  // --- Small helpers that edit the questions array immutably ---------------
  // (qi = question index, ci = choice index. Each helper returns a NEW array
  //  rather than mutating the old one, which is how React detects changes.)

  // Add or remove a filière from the targeted list.
  const toggleFiliere = (id) => {
    setFiliereIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Append a fresh blank question.
  const addQuestion = () => {
    setQuestions(qs => [...qs, { text: '', choices: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }])
  }
  // Delete question number `qi`.
  const removeQuestion = (qi) => {
    setQuestions(qs => qs.filter((_, i) => i !== qi))
  }
  // Change the wording of question `qi`.
  const updateQuestion = (qi, text) => {
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, text } : q))
  }
  // Change the wording of choice `ci` in question `qi`.
  const updateChoice = (qi, ci, text) => {
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, choices: q.choices.map((c, j) => j === ci ? { ...c, text } : c) } : q))
  }
  // Mark choice `ci` as the correct one (and all others as wrong).
  const setCorrect = (qi, ci) => {
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, choices: q.choices.map((c, j) => ({ ...c, isCorrect: j === ci })) } : q))
  }
  // Add another (empty, wrong) choice to question `qi`.
  const addChoice = (qi) => {
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, choices: [...q.choices, { text: '', isCorrect: false }] } : q))
  }
  // Remove choice `ci`. Keeps a minimum of 2 choices, and makes sure at least
  // one remaining choice is still marked correct.
  const removeChoice = (qi, ci) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q
      if (q.choices.length <= 2) return q
      const next = q.choices.filter((_, j) => j !== ci)
      if (!next.some(c => c.isCorrect)) next[0].isCorrect = true
      return { ...q, choices: next }
    }))
  }

  // submit: validate every field, then create the quiz on the server.
  const submit = async () => {
    // Each check stops early with a helpful message if something is missing.
    if (!meta.title.trim()) { setError('Title is required'); return }
    if (!meta.timeLimit || meta.timeLimit < 1) { setError('Time limit must be at least 1 minute'); return }
    if (filiereIds.length === 0) { setError('Select at least one filière'); return }
    if (questions.length === 0) { setError('Add at least one question'); return }
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) { setError(`Question ${i + 1} needs text`); return }
      if (q.choices.some(c => !c.text.trim())) { setError(`Question ${i + 1} has an empty choice`); return }
      if (!q.choices.some(c => c.isCorrect)) { setError(`Question ${i + 1} needs a correct answer marked`); return }
    }

    setSaving(true); setError('')
    try {
      await quizzesAPI.create({
        title: meta.title,
        description: meta.description,
        timeLimit: Number(meta.timeLimit),
        filiereIds,
        questions,
      })
      setPage('teacher-quizzes')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create quiz')
    } finally { setSaving(false) }
  }

  return (
    <div className="content">
      <button className="btn btn-neutral btn-sm" style={{ marginBottom: 20 }} onClick={() => setPage('teacher-quizzes')}>
        <i className="ti ti-arrow-left" aria-hidden="true" />Back to quizzes
      </button>
      <div className="page-header">
        <div className="page-title">Create QCM Quiz</div>
        <div className="page-sub">Generate from a document with AI, or write questions by hand.</div>
      </div>

      {/* AI generator — drop a PDF/DOCX and let the AI draft the questions */}
      <div className="card" style={{ marginBottom: 20, borderColor: 'var(--gold-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: 'var(--gold)', flexShrink: 0 }}>
            <i className="ti ti-sparkles" aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Generate with AI</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Drop a lesson file — the AI drafts questions you can edit below.</div>
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setGenDragging(true) }}
          onDragLeave={() => setGenDragging(false)}
          onDrop={e => { e.preventDefault(); setGenDragging(false); pickGenFile(e.dataTransfer.files?.[0]) }}
          onClick={() => genFileRef.current.click()}
          style={{ border: `2px dashed ${genDragging ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: genDragging ? 'var(--gold-dim)' : 'var(--surface2)' }}
        >
          {genFile ? (
            <div>
              <i className="ti ti-file-text" aria-hidden="true" style={{ fontSize: 30, color: 'var(--gold)', display: 'block', marginBottom: 8 }} />
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{genFile.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{(genFile.size / 1024 / 1024).toFixed(2)} MB</div>
              <button className="btn btn-neutral btn-sm" style={{ marginTop: 12 }} onClick={e => { e.stopPropagation(); setGenFile(null) }}>
                <i className="ti ti-x" aria-hidden="true" />Remove
              </button>
            </div>
          ) : (
            <div>
              <i className="ti ti-cloud-upload" aria-hidden="true" style={{ fontSize: 32, color: 'var(--icon)', display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 5 }}>Drop a PDF or DOCX here, or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>PDF, DOCX — up to 50 MB</div>
            </div>
          )}
        </div>
        <input ref={genFileRef} type="file" style={{ display: 'none' }} accept=".pdf,.docx" onChange={e => pickGenFile(e.target.files?.[0])} />

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, width: 180 }}>
            <label className="field-label">Number of questions</label>
            <input className="field-input" type="number" min="1" max="20" value={genCount}
              onChange={e => setGenCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={generating || !genFile} style={{ marginLeft: 'auto' }}>
            {generating ? <><span className="spinner" />Generating…</> : <><i className="ti ti-sparkles" aria-hidden="true" />Generate questions</>}
          </button>
        </div>
        {generating && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Reading your document and writing questions — this can take up to a minute.</div>}
        {genNotice && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--green)', marginTop: 10 }}><i className="ti ti-circle-check" aria-hidden="true" />{genNotice}</div>}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}><i className="ti ti-alert-triangle" aria-hidden="true" /><span>{error}</span></div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="two-col">
          <div className="field">
            <label className="field-label">Title *</label>
            <input className="field-input" value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} placeholder="e.g. Chapter 3 — Algorithms" />
          </div>
          <div className="field">
            <label className="field-label">Time limit (minutes) *</label>
            <input className="field-input" type="number" min="1" value={meta.timeLimit} onChange={e => setMeta(m => ({ ...m, timeLimit: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Description</label>
          <textarea className="field-input" value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} placeholder="Optional context for students…" style={{ minHeight: 60 }} />
        </div>
        <div className="field">
          <label className="field-label">Target filières *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(filieres || []).filter(f => f.active).map(f => {
              const on = filiereIds.includes(f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFiliere(f.id)}
                  aria-pressed={on}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '0 14px', height: 38, borderRadius: 10,
                    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
                    background: on ? 'var(--gold-dim)' : 'transparent',
                    color: on ? 'var(--gold)' : 'var(--text2)',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className="ti ti-school" aria-hidden="true" />
                  {f.name} ({f.code})
                </button>
              )
            })}
            {(filieres || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>No filières yet — ask admin to create some first.</div>
            )}
          </div>
        </div>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>Question {qi + 1}</div>
            {questions.length > 1 && (
              <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(qi)}>
                <i className="ti ti-trash" aria-hidden="true" />Remove
              </button>
            )}
          </div>
          <div className="field">
            <label className="field-label">Question text *</label>
            <textarea className="field-input" value={q.text} onChange={e => updateQuestion(qi, e.target.value)} placeholder="Type the question…" style={{ minHeight: 60 }} />
          </div>
          <div className="field">
            <label className="field-label">Choices (mark the correct one)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.choices.map((c, ci) => (
                <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={c.isCorrect}
                    onChange={() => setCorrect(qi, ci)}
                    aria-label={`Mark choice ${ci + 1} as correct`}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <input
                    className="field-input"
                    style={{ flex: 1 }}
                    value={c.text}
                    onChange={e => updateChoice(qi, ci, e.target.value)}
                    placeholder={`Choice ${ci + 1}`}
                  />
                  {q.choices.length > 2 && (
                    <button className="btn btn-neutral btn-sm" onClick={() => removeChoice(qi, ci)} aria-label="Remove choice">
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => addChoice(qi)}>
              <i className="ti ti-plus" aria-hidden="true" />Add choice
            </button>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn btn-neutral" onClick={addQuestion}>
          <i className="ti ti-plus" aria-hidden="true" />Add question
        </button>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={submit} disabled={saving}>
          {saving ? <><span className="spinner" />Publishing…</> : <>Publish quiz <i className="ti ti-send" aria-hidden="true" /></>}
        </button>
      </div>
    </div>
  )
}

// ─── QUIZ RESULTS ────────────────────────────────────
// Shows how students performed on a quiz: total attempts, average score,
// number who passed, plus a per-student table.
function QuizResults({ quiz, setPage }) {
  const { data: attempts, loading } = useFetch(() => quizzesAPI.getAttempts(quiz.id), [quiz.id])
  const total = (attempts || []).length                                    // how many students attempted
  const avg = total === 0 ? 0 : Math.round((attempts || []).reduce((s, a) => s + a.score, 0) / total)  // average score
  const pass = (attempts || []).filter(a => a.score >= 50).length          // count scoring 50%+

  return (
    <div className="content">
      <button className="btn btn-neutral btn-sm" style={{ marginBottom: 20 }} onClick={() => setPage('teacher-quizzes')}>
        <i className="ti ti-arrow-left" aria-hidden="true" />Back to quizzes
      </button>
      <div className="page-header">
        <div className="page-title">{quiz.title}</div>
        <div className="page-sub">Quiz results overview</div>
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon"><i className="ti ti-users" aria-hidden="true" /></div><div className="stat-value">{total}</div><div className="stat-label">Attempts</div></div>
        <div className="stat-card"><div className="stat-icon"><i className="ti ti-percentage" aria-hidden="true" /></div><div className="stat-value">{avg}%</div><div className="stat-label">Average</div></div>
        <div className="stat-card"><div className="stat-icon"><i className="ti ti-check" aria-hidden="true" /></div><div className="stat-value">{pass}</div><div className="stat-label">Pass (≥ 50%)</div></div>
        <div className="stat-card"><div className="stat-icon"><i className="ti ti-clock" aria-hidden="true" /></div><div className="stat-value">{quiz.timeLimit}m</div><div className="stat-label">Time limit</div></div>
      </div>
      {loading ? <div className="spinner spinner-lg" /> : (attempts || []).length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-clipboard-off empty-icon" aria-hidden="true" />
          <div className="empty-text">No student has submitted this quiz yet.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Filière</th><th>Score</th><th>Correct</th><th>Submitted</th></tr></thead>
            <tbody>
              {(attempts || []).map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--surface)', flexShrink: 0 }}>
                        {a.student?.firstName?.[0]}{a.student?.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{a.student?.firstName} {a.student?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.student?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.student?.filiere ? <span className="badge badge-neutral">{a.student.filiere.code}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                  <td>
                    <span className={`badge ${a.score >= 75 ? 'badge-success' : a.score >= 50 ? 'badge-gold' : 'badge-danger'}`}>{a.score}%</span>
                  </td>
                  <td>{a.correctCount} / {a.totalQuestions}</td>
                  <td>{new Date(a.completedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── ROOT ────────────────────────────────────────────
// Top-level teacher component: sets up the frame, loads the shared data the
// home screen needs, and decides which sub-page to render for the active tab.

// Tab id -> title shown in the top bar.
const PAGE_TITLES = {
  'teacher-dash': 'Dashboard', 'teacher-upload': 'Upload Lesson',
  'teacher-lessons': 'My Lessons', 'teacher-reviews': 'Reviews',
  'teacher-chat': 'Chat with PDF',
  'teacher-quizzes': 'Quizzes', 'teacher-quiz-create': 'New Quiz', 'teacher-quiz-results': 'Quiz Results',
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [page, setPage] = useHashPage('teacher-dash')           // active tab (saved in the URL)
  const [sidebarOpen, setSidebarOpen] = useState(false)         // mobile drawer
  const [selectedQuiz, setSelectedQuiz] = useState(null)        // quiz whose results we're viewing
  // Data the home dashboard summarizes:
  const { data: lessons, refetch: refetchLessons } = useFetch(() => lessonsAPI.getMy())
  const { data: pending } = useFetch(() => summariesAPI.getPending())
  const { data: sessions } = useFetch(() => chatAPI.getSessions())
  const { data: quizzes } = useFetch(() => quizzesAPI.getAll())

  const sessionsCount = sessions?.length || 0
  // Add up every lesson's summary count to get a grand total.
  const totalSummaries = (lessons || []).reduce((sum, l) => sum + (l._count?.summaries || 0), 0)

  // Pick the sub-page component for the current tab.
  const renderPage = () => {
    if (page === 'teacher-upload')        return <UploadLesson onUploaded={refetchLessons} />
    if (page === 'teacher-lessons')       return <MyLessons />
    if (page === 'teacher-reviews')       return <ReviewSummaries />
    if (page === 'teacher-chat')          return <ChatPage role="TEACHER" />
    if (page === 'teacher-quizzes')       return <TeacherQuizzes setPage={setPage} setSelectedQuiz={setSelectedQuiz} />
    if (page === 'teacher-quiz-create')   return <QuizCreate setPage={setPage} />
    if (page === 'teacher-quiz-results' && selectedQuiz) return <QuizResults quiz={selectedQuiz} setPage={setPage} />
    return <TeacherHome setPage={setPage} lessons={lessons} pending={pending} sessionsCount={sessionsCount} totalSummaries={totalSummaries} quizzesCount={quizzes?.length || 0} firstName={user?.firstName} />
  }

  return (
    <div className="layout">
      <Sidebar role={user?.role} page={page} setPage={setPage} pendingCount={pending?.length || 0} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar title={PAGE_TITLES[page] || 'Dashboard'} onMenuToggle={() => setSidebarOpen(v => !v)} />
        {renderPage()}
      </div>
    </div>
  )
}
