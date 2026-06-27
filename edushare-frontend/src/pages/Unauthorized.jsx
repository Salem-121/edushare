// ============================================================================
// Unauthorized.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the "403 / Access Denied" screen. ProtectedRoute sends the
// user here when they ARE logged in but their role isn't allowed on the page
// they tried to open (e.g. a student opening an admin-only page).
// ============================================================================

import { useNavigate } from 'react-router-dom'   // lets us send the user to another page

export default function Unauthorized() {
  const navigate = useNavigate()
  return (
    <>
      {/* Full-screen centered message. */}
      <div style={{ minHeight: '100vh', background: 'var(--body-gradient,none),var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          {/* Lock icon */}
          <i className="ti ti-lock" aria-hidden="true" style={{ fontSize: 56, color: 'var(--gold)', marginBottom: 20, display: 'inline-block' }} />
          {/* Headline */}
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.02em', fontWeight: 500 }}>
            <em style={{ color: 'var(--gold)' }}>Reserved</em> reading.
          </div>
          {/* Explanation */}
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.6 }}>
            You don't have permission to view this page. Sign in with the right role and try again.
          </div>
          {/* Button back to the login page */}
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '0 22px', height: 44, background: 'var(--gold)', border: 'none', borderRadius: 10, color: 'var(--surface)', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", letterSpacing: '0.02em' }}>
            Back to login <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}
