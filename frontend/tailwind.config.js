/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: token('ink'),
        paper: token('paper'),
        surface: token('surface'),
        line: token('line'),
        muted: token('muted'),
        signal: token('signal'),
        ok: token('ok'),
        transit: token('transit'),
        warn: token('warn'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        panel: '6px',
      },
      maxWidth: {
        content: '1280px',
        wide: '1360px',
      },
    },
  },
  plugins: [],
};
