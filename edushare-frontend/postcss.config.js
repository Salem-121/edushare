// ============================================================================
// postcss.config.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: configuration for PostCSS, the tool that processes our CSS
// during the build. It runs two plugins:
//   • tailwindcss  — generates the Tailwind utility classes.
//   • autoprefixer — adds browser-specific prefixes (e.g. -webkit-) so styles
//                    work across older browsers automatically.
// ============================================================================

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
