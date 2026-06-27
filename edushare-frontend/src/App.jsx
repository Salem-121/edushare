// ============================================================================
// App.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the root of the React app. It wires together the big
// pieces that everything else depends on:
//   • ErrorBoundary  — catches crashes so the app never goes fully blank.
//   • ThemeProvider  — light/dark mode for the whole app.
//   • AuthProvider   — "who is logged in?" for the whole app.
//   • BrowserRouter  — maps URLs (like /student/dashboard) to pages.
// It also defines the routes (which URL shows which page) and protects the
// dashboards by role.
// ============================================================================

import { lazy, Suspense } from 'react'                       // lazy/Suspense = load code only when needed
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './utils/ProtectedRoute'          // the role-based "bouncer"
import ErrorBoundary from './components/common/ErrorBoundary'
import { STYLES } from './styles/theme'                      // the app's CSS, as one big string

// Code-split each dashboard so students don't download teacher/admin code
// (and vice versa). The login page is still eager — it's the entry point.
// `lazy(() => import(...))` means each dashboard's code is only fetched the
// first time it's actually visited, which keeps the initial load small.
import Login from './pages/auth/Login'
import Unauthorized from './pages/Unauthorized'
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'))
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'))
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'))

// Shown briefly while a lazy-loaded dashboard's code is downloading.
function Fallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="spinner spinner-lg" />
    </div>
  )
}

export default function App() {
  return (
    // Outermost: catch any render crash anywhere in the tree.
    <ErrorBoundary>
      {/* Global theme + styles injected once here (STYLES already contains
          THEME). Each dashboard used to inject the same string on mount,
          producing duplicate stylesheets. */}
      <style>{STYLES}</style>
      {/* Providers wrap everything so any page can read theme + auth. */}
      <ThemeProvider>
        <AuthProvider>
          {/* Router turns the browser URL into the matching page below. */}
          <BrowserRouter>
            {/* Suspense shows <Fallback> while a lazy dashboard loads. */}
            <Suspense fallback={<Fallback />}>
              <Routes>
                {/* Public pages — no login required. */}
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Admin dashboard — only users with the ADMIN role get in. */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                {/* Teacher dashboard — TEACHER role only. */}
                <Route path="/teacher/dashboard" element={
                  <ProtectedRoute roles={['TEACHER']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                } />

                {/* Student dashboard — STUDENT role only. */}
                <Route path="/student/dashboard" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } />

                {/* Any unknown URL ("*") sends the user to the login page. */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
