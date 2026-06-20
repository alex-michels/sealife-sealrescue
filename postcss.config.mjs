// Tailwind v4 подключается как PostCSS-плагин.
// Влияет только на CSS публичного фронтенда (globals.css). Админку Payload не трогает —
// у неё свой CSS-конвейер (@payloadcms/next/css).
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
