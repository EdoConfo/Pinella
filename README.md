# Pinella · Segnapunti

Segnapunti per **Burraco**: partite casual a coppie, tornei a girone
all'italiana, rubrica giocatori con avatar, storico, statistiche e manuale di
gioco. PWA statica, vanilla JS, ospitata su GitHub Pages. Tutti i dati restano
sul dispositivo (`localStorage`).

🔗 https://edoconfo.github.io/Pinella/

## Funzioni

- **Partita casual** — assegni i giocatori a Squadra A/B, segni le mani
  (burraco pulito/semipulito/sporco, punti tavolo e mano, chiusura, pozzetto),
  tabellone in tempo reale con vincitore e coriandoli.
- **Conta le carte** (opzionale) — invece di scrivere i punti di tavolo/mano,
  inserisci quante carte hai per tipo e l'app calcola; i conteggi vengono
  ricordati nella mano.
- **Tornei** — girone all'italiana a coppie, calendario per turni, classifica
  (vittorie/differenza/punti fatti), vincitore a fine torneo, rinomina/elimina.
- **Giocatori** — rubrica con avatar (simbolo/colore/foto) e statistiche per
  giocatore (partite, vittorie, %, miglior compagno, avversario più battuto,
  partite recenti).
- **Storico** — partite concluse archiviate, con dettaglio mano-per-mano.
- **Backup** — esporta/importa tutti i dati in un file JSON.
- **Manuale** — "Come si gioca a Burraco" (icona ? nell'header e in
  Impostazioni); i valori dei bonus sono configurabili (varianti regionali).
- **PWA** — funziona offline (service worker), si aggiunge alla schermata Home.

## Struttura

- `index.html` — markup e tutte le viste/fogli
- `assets/styles.css` — stili
- `assets/js/main.js` — logica (IIFE, nessuna dipendenza)
- `assets/img/` — icone (manifest + apple-touch)
- `manifest.webmanifest` — manifest PWA
- `sw.js` — service worker (offline)

## Sviluppo

È un sito statico, nessun build step. Per provarlo in locale serve un server
HTTP qualsiasi (il service worker non funziona da `file://`):

```sh
npx serve .
# oppure
python3 -m http.server 8000
```

Deploy: push su `main` → GitHub Pages pubblica la root.

## ⚠️ Versioning della cache (importante)

CSS e JS sono richiamati con una query `?v=N` e il service worker precarica
gli asset con lo stesso numero. **Quando modifichi `styles.css` o `main.js`,
bump del numero in due punti, sempre insieme:**

1. `index.html` — `assets/styles.css?v=N` e `assets/js/main.js?v=N`
2. `sw.js` — `var VERSION = "N"` **e** le voci `?v=N` nell'array `ASSETS`

Se non li allinei, iOS/SW continuano a servire la versione vecchia. L'HTML usa
strategia *network-first* quindi `index.html` è sempre fresco online; gli asset
versionati sono *cache-first*.

Le icone e i meta tag (es. `apple-mobile-web-app-status-bar-style`) della web
app installata si aggiornano solo **rimuovendo e ri-aggiungendo** l'app alla
schermata Home su iOS.
