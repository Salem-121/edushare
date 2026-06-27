// ============================================================================
// main.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the very first JavaScript that runs in the browser — the
// "entry point". Its only job is to find the empty <div id="root"> in
// index.html and render our whole React <App> into it.
// ============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'      // the root component (sets up routing, context, etc.)
import './index.css'            // global styles, loaded once for the whole app

// Find <div id="root"> and mount the React app inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode is a development-only helper that warns about unsafe patterns.
  // It doesn't render anything visible and has no effect in production builds.
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
