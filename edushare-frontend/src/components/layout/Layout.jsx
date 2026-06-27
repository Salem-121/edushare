// ============================================================================
// Layout.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the shared "frame" around every logged-in page. It holds
// two pieces:
//   • Sidebar — the left navigation menu (different links per role).
//   • Topbar  — the bar across the top with the page title, theme toggle, and
//               the notifications bell.
// The individual dashboards drop their content in the middle of this frame.
// ============================================================================

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'      // who is logged in (+ logout)
import { useTheme } from '../../context/ThemeContext'     // light/dark toggle
import { useNavigate } from 'react-router-dom'            // programmatic page navigation
import { notificationsAPI } from '../../services/api'     // load/mark notifications

// ── Sidebar: the left navigation menu ───────────────────────────────────────
// Props: role (decides which links to show), page/setPage (current tab + setter),
// pendingCount (badge number for teachers), open/onClose (mobile drawer state).
export function Sidebar({ role, page, setPage, pendingCount = 0, open = false, onClose }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  // Each role gets its own list of menu items. An item is just { id, icon, label }.
  // The `id` doubles as the page key the dashboards switch on.
  const adminNav = [
    { id: 'admin-dash',     icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'admin-users',    icon: 'ti-users',            label: 'Users' },
    { id: 'admin-modules',  icon: 'ti-books',            label: 'Modules' },
    { id: 'admin-filieres', icon: 'ti-school',           label: 'Filières' },
  ]
  const teacherNav = [
    { id: 'teacher-dash',    icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'teacher-upload',  icon: 'ti-upload',           label: 'Upload Lesson' },
    { id: 'teacher-lessons', icon: 'ti-clipboard-list',   label: 'My Lessons' },
    { id: 'teacher-quizzes', icon: 'ti-checklist',        label: 'Quizzes' },
    { id: 'teacher-chat',    icon: 'ti-message-circle',   label: 'Chat with PDF' },
    // `badge` shows a count of summaries waiting for review (hidden when 0).
    { id: 'teacher-reviews', icon: 'ti-eye-check',        label: 'Reviews', badge: pendingCount || null },
  ]
  const studentNav = [
    { id: 'student-dash',      icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'student-browse',    icon: 'ti-search',           label: 'Browse Lessons' },
    { id: 'student-quizzes',   icon: 'ti-checklist',        label: 'Quizzes' },
    { id: 'student-practice',  icon: 'ti-sparkles',         label: 'Practice Quiz' },
    { id: 'student-chat',      icon: 'ti-message-circle',   label: 'Chat with PDF' },
    { id: 'student-summaries', icon: 'ti-notebook',         label: 'My Summaries' },
  ]

  // Pick the right menu for this user's role.
  const nav = role === 'ADMIN' ? adminNav : role === 'TEACHER' ? teacherNav : studentNav
  // Build the avatar text from the user's initials, e.g. "John Doe" -> "JD".
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : '?'

  // Clicking a menu item: switch tab, then close the mobile drawer if open.
  const handleNav = (id) => {
    setPage(id)
    onClose?.()
  }

  // Sign out, then send the user back to the login page.
  const handleLogout = () => { logout(); navigate('/login') }

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Dimmed background shown behind the drawer on mobile; click it to close. */}
      <div
        className={`sidebar-overlay${open ? ' visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* The actual sidebar panel. */}
      <div className={`sidebar${open ? ' open' : ''}`} role="navigation" aria-label="Main navigation">
        {/* App logo at the top */}
        <div className="sidebar-logo">
          <div className="logo-box" aria-hidden="true"><i className="ti ti-books" /></div>
          <span className="logo-text">EduShare</span>
        </div>

        {/* The list of navigation buttons, built from the `nav` array above. */}
        <div className="nav-section">
          <div className="nav-label">Navigation</div>
          {nav.map(n => (
            <button
              key={n.id}
              className={`nav-item${page === n.id ? ' active' : ''}`}   // highlight the current tab
              onClick={() => handleNav(n.id)}
              aria-current={page === n.id ? 'page' : undefined}
            >
              <i className={`ti ${n.icon}`} aria-hidden="true" />
              <span>{n.label}</span>
              {/* Optional little count bubble (e.g. pending reviews) */}
              {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* Bottom of the sidebar: the user's chip + a sign-out button. */}
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">{user?.role?.toLowerCase()}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-signout">
            <i className="ti ti-logout" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  )
}

// ── Animated theme toggle ──
// A small sun/moon button that flips between light and dark mode.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="icon-btn"
      style={{ width: 40, height: 40 }}
    >
      {/* Show a sun in dark mode (click to go light) and a moon in light mode. */}
      <i className={`ti ${isDark ? 'ti-sun' : 'ti-moon'}`} aria-hidden="true" style={{ fontSize: 18 }} />
    </button>
  )
}

// ── Topbar: the bar across the top of every page ────────────────────────────
// Props: title (the page heading) and onMenuToggle (opens the mobile sidebar).
export function Topbar({ title, onMenuToggle }) {
  const [notifications, setNotifications] = useState([])   // the list of alerts
  const [showNotifs, setShowNotifs] = useState(false)      // is the dropdown open?
  const notifRef = useRef(null)                            // handle to the dropdown, for outside-click detection
  const unread = notifications.filter(n => !n.read).length // how many are unread

  // Load notifications once, then re-poll every 60 seconds to stay fresh.
  useEffect(() => {
    const load = () => notificationsAPI.getAll()
      .then(res => setNotifications(res.data))
      .catch(() => {})                                     // ignore errors silently (it's a background poll)
    load()
    const id = setInterval(load, 60_000)                   // every 60s
    return () => clearInterval(id)                         // stop polling when the component unmounts
  }, [])

  // Also refresh the list the moment the user opens the dropdown.
  useEffect(() => {
    if (!showNotifs) return
    notificationsAPI.getAll()
      .then(res => setNotifications(res.data))
      .catch(() => {})
  }, [showNotifs])

  // Close dropdown on outside click
  // (If the user clicks anywhere that isn't inside the dropdown, close it.)
  useEffect(() => {
    if (!showNotifs) return
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  // Mark a single notification as read (server + local state).
  const markRead = async (id) => {
    await notificationsAPI.markRead(id)
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  }

  // Mark every notification as read at once.
  const markAllRead = async () => {
    await notificationsAPI.markAllRead()
    setNotifications(p => p.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="topbar">
      {/* Hamburger button — only on mobile, opens the sidebar drawer. */}
      {onMenuToggle && (
        <button className="hamburger" onClick={onMenuToggle} aria-label="Toggle navigation menu">
          <i className="ti ti-menu-2" aria-hidden="true" />
        </button>
      )}

      {/* The current page's title. */}
      <div className="topbar-title" style={{ flex: 1 }}>{title}</div>

      <div className="topbar-actions">
        <ThemeToggle />

        {/* Notifications bell + its dropdown. */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            onClick={() => setShowNotifs(v => !v)}     // toggle the dropdown open/closed
          >
            <i className="ti ti-bell" aria-hidden="true" />
            {/* Red dot appears only when there are unread notifications. */}
            {unread > 0 && <span className="notif-dot" />}
          </button>

          {/* The dropdown panel, only rendered while open. */}
          {showNotifs && (
            <div style={{
              position: 'absolute', top: 48, right: 0,
              width: 'min(340px, calc(100vw - 24px))',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12,
              zIndex: 100, overflow: 'hidden', animation: 'slideUp 0.2s ease',
            }}>
              {/* Dropdown header: title + "Mark all read" link. */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Notifications
                  {unread > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 500 }}>{unread} new</span>}
                </span>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Mark all read
                  </button>
                )}
              </div>
              {/* The scrollable list of notifications. */}
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  // Empty state when there's nothing to show.
                  <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text3)' }}>
                    <i className="ti ti-bell-off" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: 0.6 }} aria-hidden="true" />
                    <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text2)' }}>Nothing new here yet.</div>
                  </div>
                ) : notifications.map(n => (
                  // One row per notification; clicking it marks it read.
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      padding: '13px 16px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', background: n.read ? 'transparent' : 'var(--gold-dim)',  // unread = highlighted
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, color: n.read ? 'var(--text2)' : 'var(--text)', marginBottom: 4, lineHeight: 1.55 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
