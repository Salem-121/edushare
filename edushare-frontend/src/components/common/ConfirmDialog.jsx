// ============================================================================
// ConfirmDialog.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: a reusable popup that asks "Are you sure?" before doing
// something risky (like deleting). It replaces the browser's ugly built-in
// window.confirm() with one that matches our app's theme and is keyboard- and
// screen-reader-friendly.
// ============================================================================

import { useEffect, useRef } from 'react'

/**
 * Accessible confirm dialog. Replaces native window.confirm.
 * - Closes on Escape, confirms on Enter.
 * - Auto-focuses the confirm button.
 * - Uses .modal CSS so it themes correctly in light/dark.
 */
// The props let the caller customize every part of the dialog:
export default function ConfirmDialog({
  open,                         // true = show the dialog, false = render nothing
  title = 'Are you sure?',      // big heading text
  message,                      // optional explanation under the title
  confirmText = 'Confirm',      // label for the "yes, do it" button
  cancelText = 'Cancel',        // label for the "no, back out" button
  danger = false,               // true = style the confirm button red (destructive action)
  busy = false,                 // true = action in progress; disables buttons & shows a spinner
  onConfirm,                    // function to run when the user confirms
  onCancel,                     // function to run when the user cancels
}) {
  const confirmRef = useRef(null)   // a handle to the confirm button so we can focus it

  // Keyboard handling: only active while the dialog is open.
  useEffect(() => {
    if (!open) return                          // dialog closed -> do nothing
    confirmRef.current?.focus()                // move keyboard focus to the confirm button
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.()    // Esc = cancel
      if (e.key === 'Enter'  && !busy) onConfirm?.()   // Enter = confirm
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)   // clean up the listener
  }, [open, busy, onCancel, onConfirm])

  // If we're not supposed to be open, render nothing at all.
  if (!open) return null

  return (
    // The dark overlay behind the dialog. Clicking it (the background, not the
    // dialog) cancels — that's what the e.target === e.currentTarget check does.
    <div
      className="modal-overlay"
      role="dialog"             // tells screen readers this is a dialog
      aria-modal="true"         // ...that blocks the rest of the page
      aria-labelledby="confirm-title"
      onClick={e => e.target === e.currentTarget && !busy && onCancel?.()}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <div id="confirm-title" className="modal-title">{title}</div>
        {/* Only show the message line if one was provided */}
        {message && <div className="modal-sub" style={{ marginBottom: 0 }}>{message}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>{cancelText}</button>
          <button
            ref={confirmRef}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}   // red if dangerous, gold otherwise
            onClick={onConfirm}
            disabled={busy}
          >
            {/* While busy, show a spinner + "Working"; otherwise the normal label */}
            {busy ? <><span className="spinner" />Working</> : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
