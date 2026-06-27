// ============================================================================
// tailwind.config.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: configuration for Tailwind CSS (a utility-class styling
// framework). `content` tells Tailwind which files to scan for class names so
// it can strip out any CSS you don't actually use. (Most of this app's styling
// is custom CSS in src/styles/theme.js rather than Tailwind classes.)
// ============================================================================

export default {
  // Files Tailwind scans for class names like "flex", "p-4", etc.
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },   // place to add custom colors/spacing (none added here)
  plugins: [],             // extra Tailwind plugins (none used)
}
