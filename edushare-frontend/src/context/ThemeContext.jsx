// ============================================================================
// ThemeContext.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the "light mode / dark mode" brain of the app.
// Like AuthContext, it's a shared box of data — but instead of the user, it
// holds the current theme ("light" or "dark") and a function to flip it.
// Any component can read the theme or toggle it without prop-drilling.
// ============================================================================

import { createContext, useContext, useState, useEffect } from 'react'

// The shared box that will hold { theme, toggleTheme }.
const ThemeContext = createContext(null)

// --- The Provider: wraps the app and supplies the theme to everyone ---------
export function ThemeProvider({ children }) {
  // STATE: the current theme. The function passed to useState runs only once,
  // on first render, to decide the *initial* theme.
  const [theme, setTheme] = useState(() => {
    // Saved preference wins. If none, fall back to the OS preference, then to
    // light. This matters when localStorage gets cleared (e.g. Brave Shields'
    // "clear site data on close") — without this, every fresh session would
    // default to dark and override the user's last choice.
    try {
      const stored = localStorage.getItem('theme')    // did the user pick a theme before?
      if (stored) return stored                        // yes -> use it
    } catch (_) { /* sandboxed storage */ }            // localStorage blocked? just skip it
    // No saved choice: ask the operating system if it prefers dark mode.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'                                      // final fallback
  })

  // Whenever `theme` changes, apply it to the page and remember it.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)  // sets <html data-theme="dark"> so CSS can react
    localStorage.setItem('theme', theme)                        // save the choice for next visit
  }, [theme])                                                   // re-run only when theme changes

  // Flip between dark and light. `t` is the current theme value.
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // Share the theme + toggle function with everything inside the provider.
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// --- Shortcut hook: const { theme, toggleTheme } = useTheme() ---------------
export const useTheme = () => useContext(ThemeContext)
