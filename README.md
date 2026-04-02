# Atomic Habits Tracker

A production-ready single-page habit tracker inspired by James Clear's *Atomic Habits*.

**Live Demo:** https://longaotian88.github.io/atomic-habits-tracker/

## Features

- ✅ **Habit Tracker** — Add/delete habits, daily check-off with visual streak calendar ("don't break the chain")
- ✅ **Habit Loop Display** — Per-habit Cue → Craving → Response → Reward loop editor
- ✅ **Identity Tracking** — Set identity-based habits (e.g. "I am a runner")
- ✅ **Habit Stacking** — "After [existing habit], I will [new habit]" cards
- ✅ **1% Better Visual** — Compound effect comparison: 1% better vs 1% worse each day
- ✅ **Daily Scorecard** — Star-based daily score across all habits
- ✅ **Environment Design Tips** — Make good habits obvious, bad habits invisible
- ✅ **Tiny Habits Guide** — BJ Fogg's method integration
- ✅ **Dark Mode** — Toggle between light and dark themes
- ✅ **Mobile Responsive** — Works on all screen sizes
- ✅ **LocalStorage** — All data stored locally, no backend needed

## Tech Stack

Pure HTML + CSS + JavaScript. No frameworks, no build step, no server.

## Deployment

The site deploys automatically via GitHub Actions on every push to `master`.

```
https://longaotian88.github.io/atomic-habits-tracker/
```

## ⚠️ Note on Privacy

GitHub Pages requires a **paid GitHub plan** to host private repositories. 
The repository is currently public to enable GitHub Pages. All habit data is stored 
in your **browser's localStorage** — no data ever leaves your device.

To host privately, consider: Netlify Drop, Vercel, or GitHub Pages with a paid plan.

## Local Development

Simply open `index.html` in a browser, or use a local server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## License

MIT
