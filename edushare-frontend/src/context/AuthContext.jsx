// ============================================================================
// AuthContext.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the "who is logged in?" brain of the whole app.
// A React "Context" is a box of data that any component can read without
// passing props down by hand. Here the box holds the current user plus the
// login / register / logout functions, so any screen can ask "is someone
// logged in?" and "log this person in/out".
// ============================================================================

// Bring in the React tools we need:
//  - createContext: makes the shared "box" of data.
//  - useContext:    lets a component read from that box.
//  - useState:      remembers a value between re-renders (the user, loading...).
//  - useEffect:     runs side-effect code (like calling the server) after render.
import { createContext, useContext, useState, useEffect } from 'react'
// Our pre-configured functions for talking to the backend's /auth endpoints.
import { authAPI } from '../services/api'

// Create the empty context box. `null` is just the default value used when a
// component tries to read it without a provider wrapped around it.
const AuthContext = createContext(null)

// --- Helper: load the saved user out of the browser's localStorage ----------
// localStorage is a tiny storage drawer in the browser that survives reloads.
// We saved the user there as text (JSON), so here we read it back and turn it
// into a real object. If the text is corrupted, we throw it away and return null.
function readStoredUser() {
  try {
    const raw = localStorage.getItem('user')         // get the saved text (or null)
    return raw ? JSON.parse(raw) : null               // turn text back into an object
  } catch {
    localStorage.removeItem('user')                   // bad/corrupt data -> delete it
    return null                                        // and act as "nobody logged in"
  }
}

// --- The Provider: wraps the app and supplies the auth data to everyone ------
// Whatever you put inside <AuthProvider>...</AuthProvider> ("children") gets
// access to the user and the login/logout functions.
export function AuthProvider({ children }) {
  // STATE = values React watches; changing them re-renders the UI.
  const [user, setUser]               = useState(readStoredUser)                    // the logged-in user (or null)
  const [loading, setLoading]         = useState(false)                             // true while a login/register request is in flight
  const [initialized, setInitialized] = useState(!localStorage.getItem('token'))    // have we finished the first "are you still valid?" check?

  // Verify the stored token on mount so we don't flash a stale dashboard
  // (Runs once when the app first loads. It double-checks the saved token with
  //  the server, so we never show a dashboard to someone whose login expired.)
  useEffect(() => {
    const token = localStorage.getItem('token')        // the saved login token, if any
    if (!token) { setInitialized(true); return }       // no token -> nobody to verify, we're done
    let cancelled = false                              // guard: ignore the result if this effect was cleaned up
    authAPI.me()                                       // ask the server "who am I, based on this token?"
      .then(({ data }) => {                            // SUCCESS: token is still valid
        if (cancelled) return
        const u = data.user || data                    // accept either {user:{...}} or the user object directly
        setUser(u)                                     // remember the fresh user
        try { localStorage.setItem('user', JSON.stringify(u)) } catch {}  // re-save it for next time
      })
      .catch(() => {                                   // FAILURE: token is bad/expired
        localStorage.removeItem('token')               // throw the bad token away
        localStorage.removeItem('user')
        if (!cancelled) setUser(null)                  // mark as logged out
      })
      .finally(() => { if (!cancelled) setInitialized(true) })  // either way, the first check is now done
    return () => { cancelled = true }                  // cleanup: if component unmounts, ignore the pending result
  }, [])                                               // empty [] = run only once, on mount

  // --- login: send email/password to the server and store the result --------
  const login = async (email, password) => {
    setLoading(true)                                   // show "working..." state
    try {
      const { data } = await authAPI.login({ email, password })   // call POST /auth/login
      localStorage.setItem('token', data.token)                   // save the token for future requests
      localStorage.setItem('user', JSON.stringify(data.user))     // save the user info
      setUser(data.user)                                          // update the app's state
      return { success: true, role: data.user?.role }             // tell the caller it worked (+ the role)
    } catch (err) {
      // Pull a friendly message out of the server's error response if there is one.
      return { success: false, message: err.response?.data?.message || 'Login failed' }
    } finally {
      setLoading(false)                                // always turn off the "working..." state
    }
  }

  // --- register: create a new account, then log them in -----------------------
  // Works just like login, but hits the /auth/register endpoint with the
  // whole sign-up form. On success the server returns a token + user too.
  const register = async (form) => {
    setLoading(true)
    try {
      const { data } = await authAPI.register(form)               // call POST /auth/register
      localStorage.setItem('token', data.token)                   // save token
      localStorage.setItem('user', JSON.stringify(data.user))     // save user
      setUser(data.user)                                          // update state
      return { success: true, role: data.user?.role }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' }
    } finally {
      setLoading(false)
    }
  }

  // --- logout: forget everything and reset to "nobody logged in" -------------
  const logout = () => {
    localStorage.removeItem('token')                   // delete the saved token
    localStorage.removeItem('user')                    // delete the saved user
    setUser(null)                                      // clear the app's state
  }

  // Hand the data + functions to every component inside the provider.
  // `value` is exactly what `useAuth()` will return elsewhere in the app.
  return (
    <AuthContext.Provider value={{ user, loading, initialized, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// --- Shortcut hook so components can grab the auth box in one line ----------
// Instead of writing useContext(AuthContext) everywhere, components just call
// useAuth(). Example:  const { user, logout } = useAuth()
export const useAuth = () => useContext(AuthContext)
