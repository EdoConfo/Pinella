# 🃏 Pinella · Burraco Scorekeeper

A native-feeling, offline-first Progressive Web App (PWA) for keeping score in Burraco, the Italian rummy-style card game. Built entirely with vanilla HTML, CSS and JavaScript — no frameworks, no dependencies — and designed to be fast, smooth and comfortable to use one-handed at the card table.

The app interface is in Italian.

[🌍 Try the live app](https://edoconfo.github.io/Pinella/)

---

## ✨ Features

- ⚔️ **Casual Matches & "Alleanza" (Alliance) Mode**
  Score games with up to three teams (A, B, C): one-on-one, pairs, three singles (1v1v1) or three pairs (2v2v2). An optional setting allows teams of three players. In a three-player game, the "Alleanza" button merges two players into a single team mid-game for the classic "2 vs 1" variant.

- 🏆 **Round-Robin Tournaments**
  Create pairs tournaments where every couple plays every other couple. The app generates the schedule turn by turn, including bye turns when the number of couples is odd, and keeps live standings ranked by wins, point difference and points scored. The Tournaments section is hidden by default and can be enabled in Settings.

- 📊 **Player Profiles & Stats**
  A roster of players with custom avatars (photo or symbol and color). Each profile shows games played, wins, win rate, best partner, most-beaten opponent and the last five results. The History view lists past games and a top-5 leaderboard.

- 🧮 **Card Tally Helper**
  An optional helper (Settings → "Conta le carte") to enter melded and in-hand cards by type, so the app calculates each hand's card points for you.

- 🎴 **Table Tools**
  Dealer indicator with a seating popup, a built-in "how to play" rules sheet, configurable target score and editable bonus values for regional variants (clean / semi-clean / dirty burraco, closing, untaken pot).

- 💾 **Offline-First & Private**
  All players, games, tournaments and settings are stored only in the device's `localStorage`. A Service Worker caches the app so it works fully offline (web fonts are loaded from Google Fonts when online, with system font fallbacks offline).

- 📦 **Backup & Restore**
  Export a full JSON backup (shared via the native share sheet when supported, otherwise downloaded) and import it on any device. No account or backend involved.

---

## 🎨 UI / UX Design

- **Custom design system:** built from scratch with CSS custom properties and a card-table palette — felt green, gold and paper white.
- **Native-like interactions:** bottom sheets, modals, confirmation dialogs and toast notifications (with undo) that mimic iOS/Android components, plus a confetti celebration when a game is won.
- **Hand-made components:** no UI or CSS libraries. Avatars, adaptive scoreboards, toggles and layouts designed for portrait, one-handed use on phones.

---

## 🛠 Tech Stack & Architecture

- **Markup & styling:** semantic HTML5 and vanilla CSS3 (custom properties, Flexbox, Grid, media queries, `calc()`).
- **Logic:** vanilla JavaScript (ES6+) in a single state-driven module (`assets/js/main.js`). No build step, no dependencies.
- **PWA:** `manifest.webmanifest` for "Add to Home Screen" installation with regular and maskable icons, and a Service Worker (`sw.js`) using network-first for HTML navigations and cache-first for versioned same-origin assets.

```
index.html             App shell and all views/sheets
assets/js/main.js      Application logic and state
assets/styles.css      Styles
assets/img/            App icons
manifest.webmanifest   PWA manifest
sw.js                  Service Worker
```

---

## 🚀 Local Development

The app is fully static, so there is nothing to build. Serve the folder with any static server (required for the Service Worker, which does not run on `file://`):

```bash
# Using Node
npx serve .

# Using Python
python3 -m http.server 8000
```

The site is deployed with GitHub Pages from the root of the `main` branch.

### ⚠️ Cache Versioning
CSS and JS files are referenced with a `?v=N` query string so the Service Worker picks up changes reliably.
**Whenever you change JavaScript or CSS**, bump the version **in both places** so installed copies update right away:

1. `index.html` — update `assets/styles.css?v=N` and `assets/js/main.js?v=N`
2. `sw.js` — update `var VERSION = "N"` and the matching versions in the `ASSETS` array

---

## 🔮 Roadmap

The app is complete and stable for everyday use. Ideas for future iterations:

- 🖥️ **Split-view layout for tablet/desktop:** use wider screens with multiple columns (e.g. scoreboard on the left and card tally always visible on the right, or tournament standings next to the tables).
- ⚔️ **Three-team tournaments:** extend the round-robin engine beyond pairs to 1v1v1 and 2v2v2 formats (already supported in casual matches).
- 📸 **Camera card recognition:** experimental computer vision (e.g. TensorFlow.js) to photograph the remaining cards and fill in the card tally automatically.
- 📊 **Historical charts:** SVG/Canvas charts in player profiles to show form over time and result distribution.
- 🔗 **Peer-to-peer live scoreboard:** WebRTC connection (via QR code) so one scorekeeper updates the score and every player's phone at the table syncs live, with no cloud server.
- 🏆 **Shareable results image:** render the final tournament standings as an image (Canvas API) ready to share via the native share sheet.
- ⚙️ **Rule presets:** one-tap presets for popular variants (International Burraco, etc.) that set target score and bonus values automatically, instead of editing them by hand.

---

Made with passion by **Edoardo Conforti**
*(Inspired by long Burraco evenings with friends, and built to replace easily lost paper score sheets.)*

---

## License

Released under the [MIT License](LICENSE). © 2026 EdoConfo
