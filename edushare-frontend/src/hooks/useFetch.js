// ============================================================================
// useFetch.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: a reusable "custom hook" for loading data from the server.
// A custom hook is just a function whose name starts with "use" and that uses
// other React hooks inside. This one wraps the common pattern of:
//   1. start loading  2. call the server  3. get data OR an error.
// Components use it like:  const { data, loading, error, refetch } = useFetch(...)
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Generic data-fetching hook.
 * - Race-safe: stale responses are discarded via a generation counter.
 * - No stale closures: latest fetchFn is read from a ref on every call.
 * - `refetch()` re-runs with the current fetchFn; pass { silent: true } to
 *   avoid the loading flicker (used after mutations).
 *
 * @param fetchFn  a function that returns a promise (usually an API call).
 * @param deps     when any value in this list changes, the data is re-fetched.
 */
export function useFetch(fetchFn, deps = []) {
  // The three pieces of state every data load has:
  const [data, setData]       = useState(null)   // the result once it arrives
  const [loading, setLoading] = useState(true)   // true while waiting for the server
  const [error, setError]     = useState(null)   // an error message if it failed

  // A "ref" is a box whose value survives re-renders but does NOT trigger one.
  // We keep the latest fetchFn here so an in-flight request always uses the
  // newest version (avoids the classic React "stale closure" bug).
  const fnRef = useRef(fetchFn)
  useEffect(() => { fnRef.current = fetchFn })    // keep the ref pointed at the latest fetchFn

  const tickRef = useRef(0)                       // counts each fetch so we can ignore old ones
  const hasLoadedRef = useRef(false)              // remembers whether we've successfully loaded once

  // `run` actually performs the fetch. useCallback keeps it stable between renders.
  const run = useCallback(async (opts) => {
    const silent = opts?.silent === true          // silent = don't show the spinner
    const myTick = ++tickRef.current              // this request's unique number
    // Only show the loading spinner on the very first fetch, or when the
    // caller explicitly opts in. Background refetches (e.g. after a mutation)
    // no longer blank out the UI.
    if (!hasLoadedRef.current && !silent) setLoading(true)
    setError(null)                                // clear any previous error
    try {
      const res = await fnRef.current()           // <-- actually call the server
      // Only accept this result if it's still the most recent request.
      // (If the user clicked twice, an older, slower response is ignored.)
      if (myTick === tickRef.current) {
        setData(res.data)                         // store the data
        hasLoadedRef.current = true               // remember we've loaded at least once
      }
    } catch (err) {
      if (myTick === tickRef.current) {
        // Try several places for a human-readable message, with a fallback.
        setError(err.response?.data?.message || err.message || 'Something went wrong')
      }
    } finally {
      if (myTick === tickRef.current) setLoading(false)  // done waiting (if still the latest)
    }
  }, [])

  // Run the fetch on mount, and again whenever `deps` change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, deps)

  // Hand back everything the component needs. `refetch` lets it reload on demand.
  return { data, loading, error, refetch: run }
}
