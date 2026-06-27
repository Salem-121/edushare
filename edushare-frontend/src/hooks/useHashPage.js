// ============================================================================
// useHashPage.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: a custom hook for "which tab am I on?" — but it stores the
// answer in the URL's hash (the part after #, e.g. /dashboard#students).
// Why bother? Because then the browser Back button and a page refresh remember
// the tab, instead of always snapping back to the first one.
// Used like:  const [page, setPage] = useHashPage('overview')
// ============================================================================

import { useEffect, useState, useCallback } from 'react'

/**
 * Tab state that persists in the URL hash so the browser back button and
 * page reload work naturally. We use the hash (#tab) rather than nested
 * routes to keep this change non-invasive — the dashboards already work
 * off a single `page` string.
 *
 * @param defaultPage  the tab to show when the URL has no hash.
 */
export function useHashPage(defaultPage) {
  // Read the current tab name straight out of the URL hash.
  const read = () => {
    if (typeof window === 'undefined') return defaultPage   // safety for non-browser environments
    const h = window.location.hash.replace(/^#/, '')        // "#students" -> "students"
    return h || defaultPage                                  // empty hash -> use the default
  }
  // STATE: the current tab. Initialized from the URL on first render.
  const [page, setPageState] = useState(read)

  // Reflect hash changes from the back/forward buttons.
  // (The browser fires a "hashchange" event; we re-read the tab from the URL.)
  useEffect(() => {
    const onPop = () => setPageState(read())
    window.addEventListener('hashchange', onPop)             // start listening
    return () => window.removeEventListener('hashchange', onPop)  // stop listening on unmount
  }, [])

  // Change the tab AND update the URL to match.
  const setPage = useCallback((next) => {
    setPageState(next)                                       // update the React state
    if (typeof window !== 'undefined') {
      const targetHash = next ? `#${next}` : ''
      if (window.location.hash !== targetHash) {
        // Use replaceState rather than pushing a new history entry — tab
        // changes within a dashboard shouldn't pollute history.
        history.replaceState(null, '', window.location.pathname + window.location.search + targetHash)
      }
    }
  }, [])

  // Return the pair, just like useState does: [value, setter].
  return [page, setPage]
}
