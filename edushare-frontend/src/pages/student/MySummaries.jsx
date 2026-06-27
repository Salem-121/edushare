// ============================================================================
// MySummaries.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the student's "My Summaries" page. It lists every AI
// summary the student generated, with a status badge (Pending / Approved /
// Rejected / Published). Clicking a card opens a full-detail popup (modal).
// Two pieces live here: the SummaryModal (the popup) and the page itself.
// ============================================================================

import { useState } from 'react'
import { summariesAPI } from '../../services/api'
import { useFetch } from '../../hooks/useFetch'        // our data-loading helper hook

// ─── SUMMARY MODAL ───────────────────────────────────
// The full-detail popup shown when a summary card is clicked.
function SummaryModal({ summary, meta, onClose }) {
  // The summary content is stored as a JSON string in the DB. If we were given
  // a string, parse it into an object; if parsing fails, treat it as empty.
  const s = typeof summary === 'string'
    ? (() => { try { return JSON.parse(summary) } catch { return null } })()
    : summary
  if (!s) return null   // nothing usable to show

  // Small helper that turns a status code into a colored badge.
  const statusBadge = (status) => {
    if (status === 'APPROVED') return <span className="badge badge-success"><i className="ti ti-check" aria-hidden="true" style={{ fontSize: 11 }} />Approved</span>
    if (status === 'REJECTED') return <span className="badge badge-danger"><i className="ti ti-x" aria-hidden="true" style={{ fontSize: 11 }} />Rejected</span>
    if (status === 'AUTO')     return <span className="badge badge-gold"><i className="ti ti-check" aria-hidden="true" style={{ fontSize: 11 }} />Published</span>
    return <span className="badge badge-gray"><i className="ti ti-hourglass" aria-hidden="true" style={{ fontSize: 11 }} />Pending</span>
  }

  return (
    // Dimmed full-screen backdrop; clicking it (not the card) closes the modal.
    <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, width: '100%', maxWidth: 600, maxHeight: '88vh', overflowY: 'auto', animation: 'slideUp 0.25s ease', position: 'relative' }}>

        <button onClick={onClose} className="modal-close" aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>

        {/* Header: title + badges (module, status, difficulty, date). */}
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 10 }}>AI Summary</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, marginBottom: 14, letterSpacing: '-0.02em' }}>{s.title}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {meta?.lesson?.module?.name && <span className="badge badge-neutral">{meta.lesson.module.name}</span>}
            {meta?.status && statusBadge(meta.status)}
            {s.difficulty && <span className={`badge ${s.difficulty === 'beginner' ? 'badge-success' : s.difficulty === 'advanced' ? 'badge-danger' : 'badge-gold'}`}>{s.difficulty}</span>}
            {meta?.createdAt && <span style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{new Date(meta.createdAt).toLocaleDateString()}</span>}
          </div>
        </div>

        {/* Objectives */}
        {s.objectives?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Learning Objectives</div>
            {s.objectives.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0, letterSpacing: '0.04em' }}>{i + 1}</div>
                <span style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.65, paddingTop: 2 }}>{o}</span>
              </div>
            ))}
          </div>
        )}

        {/* Key Points */}
        {s.keyPoints?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Key Points</div>
            {s.keyPoints.map((kp, i) => (
              <div key={i} style={{ marginBottom: 12, padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>{kp.heading}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{kp.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* Conclusion */}
        {s.conclusion && (
          <div style={{ padding: '16px 18px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 10 }}>
            <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 10 }}>Conclusion</div>
            <div style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.75, fontFamily: "'Playfair Display',serif", fontStyle: 'italic' }}>{s.conclusion}</div>
          </div>
        )}

        {/* Teacher feedback if rejected */}
        {meta?.feedback && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--brick-bg)', border: '1px solid var(--brick-border)', borderRadius: 10 }}>
            <div className="eyebrow" style={{ color: 'var(--brick)', marginBottom: 8 }}>Teacher Feedback</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{meta.feedback}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MY SUMMARIES PAGE ───────────────────────────────
// The list page itself.
export default function MySummaries() {
  // Load the student's summaries from the server (data + loading flag).
  const { data: summaries, loading } = useFetch(() => summariesAPI.getMy())
  // Which summary's popup is open (null = none).
  const [openSummary, setOpenSummary] = useState(null)

  // Same badge helper as in the modal (kept local for the list rows).
  const statusBadge = (s) => {
    if (s === 'APPROVED') return <span className="badge badge-success"><i className="ti ti-check" aria-hidden="true" style={{ fontSize: 11 }} />Approved</span>
    if (s === 'REJECTED') return <span className="badge badge-danger"><i className="ti ti-x" aria-hidden="true" style={{ fontSize: 11 }} />Rejected</span>
    if (s === 'AUTO')     return <span className="badge badge-gold"><i className="ti ti-check" aria-hidden="true" style={{ fontSize: 11 }} />Published</span>
    return <span className="badge badge-gray"><i className="ti ti-hourglass" aria-hidden="true" style={{ fontSize: 11 }} />Pending</span>
  }

  return (
    <div className="content">
      {/* The detail popup, only mounted when a card has been clicked. */}
      {openSummary && (
        <SummaryModal
          summary={openSummary.content}
          meta={openSummary}
          onClose={() => setOpenSummary(null)}
        />
      )}

      {/* Page heading + count of summaries. */}
      <div className="page-header">
        <div className="page-title">My Summaries</div>
        <div className="page-sub">{(summaries || []).length} summaries submitted — click any to view full details</div>
      </div>

      {/* While loading show a spinner; otherwise show the list of cards. */}
      {loading ? <div className="spinner spinner-lg" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(summaries || []).map((s) => {
            // Parse this row's JSON content so we can show a preview of it.
            const parsed = (() => { try { return JSON.parse(s.content) } catch { return null } })()
            return (
              <div key={s.id}
                onClick={() => setOpenSummary(s)}
                style={{ padding: '18px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', borderLeft: `3px solid ${s.status === 'APPROVED' ? 'var(--success)' : s.status === 'REJECTED' ? 'var(--brick)' : s.status === 'AUTO' ? 'var(--gold)' : 'var(--border)'}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.background = 'var(--gold-dim)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderLeftColor = s.status === 'APPROVED' ? 'var(--success)' : s.status === 'REJECTED' ? 'var(--brick)' : s.status === 'AUTO' ? 'var(--gold)' : 'var(--border)' }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 500, color: 'var(--text)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                      {parsed?.title || s.lesson?.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="badge badge-neutral">{s.lesson?.module?.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.04em' }}>{s.lesson?.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    {statusBadge(s.status)}
                    <span style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>View <i className="ti ti-arrow-right" aria-hidden="true" style={{ fontSize: 11 }} /></span>
                  </div>
                </div>

                {/* Preview */}
                {parsed?.conclusion && (
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, fontFamily: "'Playfair Display',serif", fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {parsed.conclusion}
                  </div>
                )}

                {/* Objectives preview */}
                {parsed?.objectives?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {parsed.objectives.slice(0, 3).map((o, j) => (
                      <span key={j} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>
                        {o.length > 40 ? o.slice(0, 40) + '…' : o}
                      </span>
                    ))}
                    {parsed.objectives.length > 3 && (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>+{parsed.objectives.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Teacher feedback preview */}
                {s.feedback && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--brick-bg)', border: '1px solid var(--brick-border)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <i className="ti ti-message-2" aria-hidden="true" style={{ color: 'var(--brick)', fontSize: 14, flexShrink: 0, marginTop: 1 }} />
                    <span><span style={{ color: 'var(--brick)', fontWeight: 500 }}>Feedback: </span>{s.feedback}</span>
                  </div>
                )}
              </div>
            )
          })}

          {(!summaries || summaries.length === 0) && (
            <div className="empty-state">
              <i className="ti ti-notebook empty-icon" aria-hidden="true" />
              <div className="empty-text">Nothing here yet. Use Chat with PDF to draft your first summary.</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
