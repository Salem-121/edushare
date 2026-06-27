// ============================================================================
// ProtectedRoute.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: a "bouncer" component for pages that require login.
// You wrap a page with it, and it decides one of three things:
//   1. Still checking the token?  -> show a loading spinner.
//   2. Not logged in?             -> send them to /login.
//   3. Logged in but wrong role?  -> send them to /unauthorized.
// Only if they pass all checks does it render the actual page (`children`).
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom'   // <Navigate> redirects; useLocation = current URL
import { useAuth } from '../context/AuthContext'           // read who is logged in

// `children` = the protected page. `roles` = optional list of allowed roles,
// e.g. roles={['admin']} means only admins may enter.
export default function ProtectedRoute({ children, roles }) {
  const { user, initialized } = useAuth()   // current user + whether the first auth check finished
  const location = useLocation()            // remember where we are, to return here after login

  // CASE 1: we haven't finished verifying the saved token yet — show a spinner
  // so we don't briefly flash the login page or the dashboard by mistake.
  if (!initialized) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }
  // CASE 2: nobody is logged in -> go to login. `state={{ from: location }}`
  // and `replace` let us send them back here afterwards without a history mess.
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  // CASE 3: logged in, but their role isn't in the allowed list -> blocked.
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  // PASSED: show the protected page.
  return children
}
