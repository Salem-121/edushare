// ============================================================================
// Login.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the sign-in / sign-up screen (the first thing visitors see).
// One component handles BOTH modes: a `mode` state flips between 'login' and
// 'register'. On success it sends the user to the right dashboard for their role.
// ============================================================================

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'      // login() / register() functions
import { useTheme } from '../../context/ThemeContext'     // light/dark toggle
import { filieresAPI, statsAPI } from '../../services/api'  // dropdown options + public counters

// All the page's styling lives in this one big CSS string and is injected via
// a <style> tag at the bottom. (Kept here so this page is fully self-contained.)
const loginCSS = `
  .page{min-height:100vh;display:flex;background:var(--body-gradient,none),var(--bg);background-attachment:fixed;animation:pageIn 0.5s ease;position:relative}
  .left-panel{flex:1;display:flex;flex-direction:column;padding:64px 72px;position:relative;z-index:1;overflow:hidden;background:var(--surface2);border-right:1px solid var(--border)}
  .left-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,var(--gradient-overlay) 0%,transparent 65%);pointer-events:none}
  .grid-lines{position:absolute;inset:0;background-image:linear-gradient(var(--panel-border) 1px,transparent 1px),linear-gradient(90deg,var(--panel-border) 1px,transparent 1px);background-size:32px 32px;opacity:0.5;pointer-events:none;z-index:0}
  .left-content{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;flex:1;gap:0}
  .brand{margin-bottom:64px;flex-shrink:0}
  .brand-logo{display:flex;align-items:center;gap:14px;margin-bottom:8px}
  .logo-icon{width:48px;height:48px;background:linear-gradient(135deg,var(--gold),var(--gold2));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;flex-shrink:0;box-shadow:0 4px 16px var(--shadow-gold-soft)}
  .brand-name{font-family:'Playfair Display',serif;font-size:30px;font-weight:700;color:var(--text);letter-spacing:-0.02em}
  .brand-tagline{font-size:11px;color:var(--text3);font-weight:600;margin-left:62px;letter-spacing:0.14em;text-transform:uppercase}
  /* Hero — strong black for the statement, italic gold for the emphasis. Maximum readability. */
  .hero-text h1{font-family:'Playfair Display',serif;font-size:clamp(40px,4.6vw,62px);font-weight:700;color:var(--text);line-height:1.08;margin-bottom:26px;letter-spacing:-0.025em}
  .hero-text h1 em{font-style:italic;font-weight:600;background:linear-gradient(135deg,var(--gold) 0%,var(--gold2) 50%,var(--gold) 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:foilShimmer 6s ease-in-out infinite}
  @keyframes foilShimmer{0%,100%{background-position:0% 0}50%{background-position:100% 0}}
  .hero-text p{font-size:16.5px;color:var(--text2);line-height:1.7;max-width:430px;font-weight:500}
  .stats-row{display:flex;gap:48px;margin-top:60px}
  .stat-num{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:var(--gold);line-height:1;letter-spacing:-0.02em}
  .stat-lbl{font-size:11px;color:var(--text2);font-weight:600;letter-spacing:0.14em;text-transform:uppercase;margin-top:8px}
  .stat-divider{width:1px;height:44px;background:var(--panel-border);align-self:center}
  .right-panel{width:520px;display:flex;align-items:center;justify-content:center;padding:48px 56px;background:var(--surface);position:relative}
  .right-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,var(--gradient-overlay) 0%,transparent 60%);pointer-events:none}
  .form-container{width:100%;max-width:400px;position:relative;z-index:1}
  .form-header{margin-bottom:36px}
  .form-header h2{font-family:'Playfair Display',serif;font-size:34px;font-weight:700;color:var(--text);margin-bottom:10px;letter-spacing:-0.02em}
  .form-header p{font-size:14px;color:var(--text2);font-weight:500;line-height:1.6}
  .form-group{margin-bottom:18px}
  .form-label{display:block;font-size:11px;font-weight:600;color:var(--text2);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px}
  .input-wrap{position:relative}
  .input-wrap .ti{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--icon);font-size:16px;pointer-events:none}
  .form-input{width:100%;background:var(--field-bg);border:1px solid var(--border);border-radius:10px;padding:0 14px 0 42px;height:46px;font-size:14.5px;color:var(--text);font-weight:500;transition:border-color 0.2s,background 0.2s,box-shadow 0.2s;outline:none;font-family:'DM Sans',sans-serif}
  .form-input::placeholder{color:var(--placeholder);font-weight:400}
  .form-input:focus{border-color:var(--gold);background:var(--field-bg-focus);box-shadow:0 0 0 3px var(--shadow-gold-soft)}
  select.form-input{cursor:pointer;padding-right:14px}
  .input-error{border-color:var(--brick)!important}
  .error-text{font-size:12px;color:var(--brick);margin-top:7px}
  .submit-btn{width:100%;padding:0 22px;height:50px;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#fff;font-size:14.5px;font-weight:600;border:none;border-radius:10px;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;margin-bottom:20px;letter-spacing:0.02em;display:inline-flex;align-items:center;justify-content:center;gap:9px;font-family:'DM Sans',sans-serif;box-shadow:0 1px 2px var(--shadow-gold-soft)}
  .submit-btn:hover{transform:translateY(-1px);box-shadow:0 10px 28px var(--shadow-gold)}
  .submit-btn:active{transform:translateY(0);box-shadow:none}
  .submit-btn:disabled{opacity:0.55;cursor:not-allowed;transform:none;box-shadow:none}
  .submit-btn:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
  .submit-btn .ti{font-size:16px}
  .loading-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.35);border-top-color:currentColor;border-radius:50%;animation:spin 0.7s linear infinite}
  .divider{display:flex;align-items:center;gap:14px;margin:0 0 20px}
  .divider-line{flex:1;height:1px;background:var(--panel-border)}
  .divider-text{font-size:11px;color:var(--text3);font-weight:600;letter-spacing:0.14em;text-transform:uppercase}
  .register-link{text-align:center;font-size:14px;color:var(--text2);font-weight:500}
  .register-link button{color:var(--gold);font-weight:600;background:none;border:none;cursor:pointer;font-size:14px;font-family:'DM Sans',sans-serif;padding:2px 4px;border-radius:4px;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px;text-decoration-color:var(--gold-border)}
  .register-link button:hover{text-decoration-color:var(--gold);color:var(--gold2)}
  .register-link button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  .alert-error{background:var(--brick-bg);border:1px solid var(--brick-border);border-radius:10px;padding:12px 14px;font-size:13px;color:var(--brick);margin-bottom:20px;display:flex;gap:9px;align-items:flex-start;line-height:1.5}
  .alert-error .ti{font-size:16px;flex-shrink:0;margin-top:1px}
  .theme-toggle{position:absolute;top:24px;right:24px;width:38px;height:38px;background:var(--surface);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--text2);cursor:pointer;transition:all 0.15s;z-index:10}
  .theme-toggle:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
  .theme-toggle:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @media(max-width:880px){.left-panel{display:none}.right-panel{width:100%;border-left:none;padding:48px 32px}}
  @media(max-width:480px){.right-panel{padding:36px 22px}.form-header h2{font-size:28px}}
`

// A regular expression ("regex") that checks an email looks like name@host.tld.
const EMAIL_RE = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/

// Compact number format: 55 → "55", 2400 → "2.4k", 8100 → "8.1k".
const fmtStat = (n) => {
  if (n == null) return '—'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export default function Login() {
  const navigate = useNavigate()                          // to redirect after success
  const location = useLocation()                          // to read the ?next= URL param
  const { login, register, loading } = useAuth()          // auth actions + loading flag
  const { theme, toggleTheme } = useTheme()               // current theme + toggle
  // --- STATE ---------------------------------------------------------------
  const [mode, setMode] = useState('login')               // 'login' or 'register'
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', filiereId: '' })  // all form fields
  const [errors, setErrors] = useState({})                // per-field validation messages
  const [serverError, setServerError] = useState('')      // error returned by the backend
  const [filieres, setFilieres] = useState([])            // study-track options for the dropdown
  const [stats, setStats] = useState(null)                // public counters for the hero panel

  // When the user switches to "register", load the list of filières for the
  // dropdown (only once — skip if we already have them).
  useEffect(() => {
    if (mode !== 'register' || filieres.length > 0) return
    filieresAPI.getAll()
      .then(res => setFilieres((res.data || []).filter(f => f.active)))   // keep only active ones
      .catch(() => {})
  }, [mode, filieres.length])

  // Real platform counters for the hero panel.
  // Load the public student/teacher/lesson counts once when the page opens.
  useEffect(() => {
    statsAPI.getPublic()
      .then(res => setStats(res.data))
      .catch(() => {})
  }, [])

  // --- validate: check the form and return an object of error messages -----
  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    if (mode === 'register') {
      if (!form.firstName.trim()) e.firstName = 'First name required'
      if (!form.lastName.trim())  e.lastName  = 'Last name required'
      // Students must pick a filière so quizzes can target them.
      // Teachers/admins are not required (teachers pick filières per quiz).
      if (form.role === 'STUDENT' && !form.filiereId && filieres.length > 0) {
        e.filiereId = 'Select your filière'
      }
    }
    return e
  }

  // --- handleSubmit: runs when the form is submitted -----------------------
  const handleSubmit = async () => {
    if (loading) return                                    // ignore double-clicks
    const e = validate()                                   // check the inputs first
    if (Object.keys(e).length) { setErrors(e); return }    // stop if anything is invalid
    setErrors({}); setServerError('')                      // clear old errors

    // Call login or register depending on the current mode.
    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await register(form)
    if (!result.success) { setServerError(result.message); return }   // show server error and stop

    // Success! Figure out where to send the user.
    const role = result.role?.toLowerCase() || 'student'
    const next = new URLSearchParams(location.search).get('next')   // a "come back here" URL, if any
    if (next && next.startsWith('/')) return navigate(next, { replace: true })  // honor it (safely)
    // Otherwise route to the dashboard that matches their role.
    if (role === 'admin')        navigate('/admin/dashboard',   { replace: true })
    else if (role === 'teacher') navigate('/teacher/dashboard', { replace: true })
    else                         navigate('/student/dashboard', { replace: true })
  }

  // update: change one form field, and clear its error if it had one.
  const update = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  // onBlur: when the user leaves a field, validate just that one field.
  const onBlur = (field) => () => {
    const e = validate()
    if (e[field]) setErrors(prev => ({ ...prev, [field]: e[field] }))
  }

  // --- RENDER: the visible page --------------------------------------------
  return (
    <>
      {/* Inject this page's CSS (the big string defined at the top). */}
      <style>{loginCSS}</style>
      <div className="page">

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} aria-hidden="true" />
        </button>

        {/* LEFT PANEL: the marketing/branding side with the live stat counters. */}
        <div className="left-panel">
          <div className="grid-lines" aria-hidden="true" />
          <div className="left-content">
            <div className="brand">
              <div className="brand-logo">
                <div className="logo-icon" aria-hidden="true"><i className="ti ti-books" /></div>
                <span className="brand-name">EduShare</span>
              </div>
              <div className="brand-tagline">Academic Resource Platform</div>
            </div>
            <div className="hero-text">
              <h1>Learn, share,<br />and <em>grow together</em></h1>
              <p>A unified platform for teachers and students to exchange knowledge, manage learning materials, and collaborate on academic progress.</p>
            </div>
            <div className="stats-row">
              <div><div className="stat-num">{fmtStat(stats?.students)}</div><div className="stat-lbl">Students</div></div>
              <div className="stat-divider" aria-hidden="true" />
              <div><div className="stat-num">{fmtStat(stats?.teachers)}</div><div className="stat-lbl">Teachers</div></div>
              <div className="stat-divider" aria-hidden="true" />
              <div><div className="stat-num">{fmtStat(stats?.lessons)}</div><div className="stat-lbl">Lessons</div></div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: the actual login / register form. */}
        <div className="right-panel">
          <form
            className="form-container"
            onSubmit={e => { e.preventDefault(); handleSubmit() }}   // preventDefault stops a full page reload
            noValidate
            aria-busy={loading}
          >
            <div className="form-header">
              <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
              <p>{mode === 'login' ? 'Welcome back — pick up where you left off.' : 'Fill in the details below to get started.'}</p>
            </div>

            {/* Red banner showing any error the server sent back. */}
            {serverError && (
              <div className="alert-error" role="alert">
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}

            {/* First/Last name fields — only shown in register mode. */}
            {mode === 'register' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" htmlFor="firstName">First Name</label>
                  <div className="input-wrap">
                    <i className="ti ti-user" aria-hidden="true" />
                    <input
                      id="firstName"
                      autoComplete="given-name"
                      className={`form-input${errors.firstName ? ' input-error' : ''}`}
                      placeholder="Jane"
                      value={form.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      onBlur={onBlur('firstName')}
                    />
                  </div>
                  {errors.firstName && <div className="error-text">{errors.firstName}</div>}
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" htmlFor="lastName">Last Name</label>
                  <div className="input-wrap">
                    <i className="ti ti-user" aria-hidden="true" />
                    <input
                      id="lastName"
                      autoComplete="family-name"
                      className={`form-input${errors.lastName ? ' input-error' : ''}`}
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      onBlur={onBlur('lastName')}
                    />
                  </div>
                  {errors.lastName && <div className="error-text">{errors.lastName}</div>}
                </div>
              </div>
            )}

            {/* Email field (always shown). */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <i className="ti ti-mail" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className={`form-input${errors.email ? ' input-error' : ''}`}
                  placeholder="you@school.edu"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  onBlur={onBlur('email')}
                />
              </div>
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>

            {/* Password field (always shown). */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-wrap">
                <i className="ti ti-lock" aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className={`form-input${errors.password ? ' input-error' : ''}`}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Enter your password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  onBlur={onBlur('password')}
                />
              </div>
              {errors.password && <div className="error-text">{errors.password}</div>}
            </div>

            {/* Role + filière selectors — only shown in register mode. */}
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="role">I am a</label>
                  <div className="input-wrap">
                    <i className="ti ti-school" aria-hidden="true" />
                    <select
                      id="role"
                      className="form-input"
                      value={form.role}
                      onChange={e => update('role', e.target.value)}
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="filiere">
                    Filière (field of study){form.role === 'STUDENT' && filieres.length > 0 ? ' *' : ''}
                  </label>
                  <div className="input-wrap">
                    <i className="ti ti-book-2" aria-hidden="true" />
                    <select
                      id="filiere"
                      className={`form-input${errors.filiereId ? ' input-error' : ''}`}
                      value={form.filiereId}
                      onChange={e => update('filiereId', e.target.value)}
                    >
                      <option value="">{filieres.length === 0 ? 'No filières available' : 'Select your filière'}</option>
                      {filieres.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                      ))}
                    </select>
                  </div>
                  {errors.filiereId && <div className="error-text">{errors.filiereId}</div>}
                </div>
              </>
            )}

            {/* Submit button — shows a spinner + "Signing in" while loading. */}
            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading
                ? <><span className="loading-spinner" aria-hidden="true" />{mode === 'login' ? 'Signing in' : 'Creating account'}</>
                : <>{mode === 'login' ? 'Sign in' : 'Create account'} <i className="ti ti-arrow-right" aria-hidden="true" /></>}
            </button>

            <div className="divider"><div className="divider-line" /><span className="divider-text">or</span><div className="divider-line" /></div>

            {/* Link at the bottom to switch between Sign in and Register. */}
            <div className="register-link">
              {mode === 'login'
                ? <>Don't have an account?{' '}
                    <button type="button" onClick={() => { setMode('register'); setErrors({}); setServerError('') }}>Register here</button></>
                : <>Already have an account?{' '}
                    <button type="button" onClick={() => { setMode('login'); setErrors({}); setServerError('') }}>Sign in</button></>}
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
