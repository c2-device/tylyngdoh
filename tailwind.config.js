/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Fed from CSS custom properties (see css/style.css :root /
        // [data-theme="light"]) so every bg-black / text-bone / border-white
        // / text-stone-* / bg-zinc-* utility in this file inverts with the
        // theme automatically — no per-element dark: classes needed.
        black: 'rgb(var(--c-black) / <alpha-value>)',
        white: 'rgb(var(--c-white) / <alpha-value>)',
        ink: 'rgb(var(--c-black) / <alpha-value>)',
        bone: 'rgb(var(--c-bone) / <alpha-value>)',
        stone: {
          100: 'rgb(var(--c-stone-100) / <alpha-value>)',
          200: 'rgb(var(--c-stone-200) / <alpha-value>)',
          300: 'rgb(var(--c-stone-300) / <alpha-value>)',
          400: 'rgb(var(--c-stone-400) / <alpha-value>)',
          500: 'rgb(var(--c-stone-500) / <alpha-value>)',
          600: 'rgb(var(--c-stone-600) / <alpha-value>)',
        },
        zinc: {
          900: 'rgb(var(--c-zinc-900) / <alpha-value>)',
          950: 'rgb(var(--c-zinc-950) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Poppins', 'ui-sans-serif', 'system-ui'],
        sans: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
      letterSpacing: {
        widest2: '.35em',
      },
      transitionTimingFunction: {
        // Strong custom curves — Tailwind's built-in eases read as weak/flat.
        // See: https://easing.dev
        'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
