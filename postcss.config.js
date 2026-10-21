// Local PostCSS config — deliberately empty.
// It stops Vite/postcss-load-config from walking up to D:\MUSHI\postcss.config.js,
// which belongs to the sibling OptSam project (Tailwind v3) and breaks this
// Tailwind v4 build. All styling is handled by @tailwindcss/vite.
export default {
  plugins: {},
}
