// ============================================================================
// ErrorBoundary.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: a safety net for the whole app. If any component crashes
// while rendering, React would normally show a blank white screen. An "error
// boundary" catches that crash and shows a friendly "Something went wrong" card
// with a reload button instead.
//
// NOTE: error boundaries MUST be written as a class component (not a function)
// because they rely on two special lifecycle methods that only classes have.
// ============================================================================

import { Component } from 'react'

/**
 * Catches uncaught render/lifecycle errors so the entire app doesn't blank out.
 * Wraps the whole router tree in App.jsx.
 */
export default class ErrorBoundary extends Component {
  // Local state: holds the caught error (null means "no error, all good").
  state = { error: null }

  // React calls this when a child throws. Whatever we return becomes the new
  // state — here we store the error so render() can show the fallback UI.
  static getDerivedStateFromError(error) {
    return { error }
  }

  // Also called on a crash, but meant for side-effects like logging.
  componentDidCatch(error, info) {
    // Could pipe to Sentry/Datadog here. For now: console + visible card.
    console.error('Unhandled UI error:', error, info?.componentStack)
  }

  // Clear the error and hard-reload, so any other stale state is wiped too.
  reset = () => {
    this.setState({ error: null })
    // Force a refresh — the offending state in the broken subtree is gone now
    // but other state may also be stale.
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    const { error } = this.state
    // No error? Just render the normal app (whatever was wrapped inside).
    if (!error) return this.props.children

    // There was an error -> show the fallback "crash" screen instead.
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg, #0f0e0b)', color: 'var(--text, #f5efe6)', padding: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 500,
            marginBottom: 12, letterSpacing: '-0.02em',
          }}>
            Something went wrong.
          </div>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 24, lineHeight: 1.6 }}>
            The page crashed before it could finish rendering. Try reloading — if it
            keeps happening, your session may be in a bad state and you can sign out
            and back in.
          </div>
          {/* Show the technical error message only if one exists */}
          {error?.message && (
            <pre style={{
              textAlign: 'left', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', padding: 12, borderRadius: 8,
              fontSize: 12, marginBottom: 20, overflow: 'auto', whiteSpace: 'pre-wrap',
            }}>{String(error.message)}</pre>
          )}
          <button
            onClick={this.reset}    // clicking reloads the page (see reset above)
            style={{
              padding: '12px 22px', background: 'var(--gold, #d4a050)', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Reload the page
          </button>
        </div>
      </div>
    )
  }
}
