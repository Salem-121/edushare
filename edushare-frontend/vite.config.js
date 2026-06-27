// ============================================================================
// vite.config.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: configuration for Vite, the build tool that runs the dev
// server (`npm run dev`) and bundles the app for production (`npm run build`).
// This config is minimal: it just enables React support.
// ============================================================================

import { defineConfig } from 'vite'             // helper that gives editor autocomplete for the config
import react from '@vitejs/plugin-react'        // the plugin that makes Vite understand JSX/React

export default defineConfig({
  plugins: [react()],   // turn on React (JSX, Fast Refresh, etc.)
})
