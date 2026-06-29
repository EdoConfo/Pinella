# 🃏 Pinella · Segnapunti Burraco

Un'applicazione web progressiva (PWA) premium, nativa e offline-first per segnare i punti a Burraco. Sviluppata interamente in Vanilla HTML, CSS e JavaScript senza l'uso di alcun framework, progettata per offrire un'esperienza utente fluida, rapida e visivamente impeccabile.

[🌍 Prova l'app live](https://edoconfo.github.io/Pinella/)

---

## ✨ Funzionalità Principali

- ⚔️ **Partite Singole & Modalità Alleanza**
  Gestione completa di partite a coppie standard e dell'innovativa modalità a 3 giocatori ("Alleanza"), in cui un giocatore singolo affronta un'alleanza di due giocatori uniti in corsa, gestita dinamicamente dal sistema.

- 🏆 **Motore di Tornei Round-Robin**
  Creazione e gestione di tornei a girone all'italiana. Il motore calcola automaticamente tutti gli abbinamenti, le rotazioni e gli eventuali "turni di riposo" in base alle coppie iscritte. Classifica dinamica basata su vittorie, differenza punti e punti totali.

- 📊 **Profili e Statistiche Avanzate**
  Una rubrica completa per tutti i giocatori. Ogni profilo traccia automaticamente decine di metriche: tasso di vittoria (%), punti fatti/subiti, "Miglior Compagno", "Bestia Nera" (avversario più ostico) e cronologia interattiva delle ultime partite. 

- 🧮 **Assistente Conta Carte**
  Invece di calcolare i conteggi a mente, l'app offre un'interfaccia dedicata per inserire semplicemente le singole carte rimaste in mano e calcolare in automatico le deduzioni in un istante.

- 💾 **Offline-First & Privacy Assoluta**
  Tutti i dati, i tornei, i profili e la cronologia risiedono esclusivamente nel `localStorage` del dispositivo. L'app funziona al 100% senza connessione internet grazie al Service Worker integrato.

- 📦 **Importazione ed Esportazione Dati**
  Possibilità di eseguire un backup completo in formato JSON, ripristinarlo all'occorrenza o trasferire tutti i progressi e le statistiche su qualsiasi altro dispositivo senza passare da alcun server.

---

## 🎨 UI / UX Design

L'interfaccia grafica è il vero fiore all'occhiello del progetto:
- **Design System Custom:** Costruito da zero con variabili CSS avanzate per garantire una consistenza assoluta (Palette colori sartoriale: verde *Feltro*, giallo *Oro*, bianco *Carta*).
- **Animazioni Native:** Le finestre (sheets a scorrimento dal basso, modali, popup di conferma e toast notification) emulano fedelmente i comportamenti fluidi dei componenti nativi di iOS/Android.
- **Componenti su Misura:** Nessuna libreria UI o CSS pre-assemblato. Avatar generativi colorati proceduralmente in base al nome, tabelloni adattivi (scoreboard), interruttori e layout studiati millimetricamente per un utilizzo verticale e a una singola mano su mobile.

---

## 🛠 Tech Stack & Architettura

Il progetto è una vetrina delle immense potenzialità del Web moderno senza astrazioni intermedie:

- **Markup & Stile:** HTML5 semantico e CSS3 Vanilla (Custom Properties, Flexbox, Grid, Media Queries, calc()).
- **Logica di Gioco:** Vanilla JavaScript (ES6+). Niente React, niente Vue. Nessuna dipendenza. Un'unica applicazione state-driven velocissima.
- **PWA (Progressive Web App):** Manifest JSON per supportare l'installazione nativa "Aggiungi a schermata Home", icone cross-platform, maskable icons e Service Worker (`sw.js`) per caching e navigazione offline assoluta (strategie network-first / cache-first modulate per gli asset e l'index).

---

## 🚀 Sviluppo & Setup Locale

Essendo un'app puramente statica, non ci sono processi di compilazione complessi o lunghi tempi di attesa.
Per farla girare localmente basta aprire la directory in un qualsiasi server statico (fondamentale solo per attivare il Service Worker, che non lavora su protocollo locale `file://`):

```bash
# Esempio usando Node
npx serve .

# Esempio usando Python
python3 -m http.server 8000
```

### ⚠️ Versioning Cache
I file CSS e JS vengono inclusi con la querystring `?v=N` per gestire aggressivamente la cache del Service Worker.
**Ogni volta che si modifica il codice JavaScript o CSS**, è cruciale aggiornare il numero di versione **in due punti contemporaneamente** per propagare subito gli aggiornamenti a tutti i telefoni installati:

1. `index.html` — Aggiornare `assets/styles.css?v=N` e `assets/js/main.js?v=N`
2. `sw.js` — Aggiornare `var VERSION = "N"` e le corrispondenti versioni nell'array `ASSETS`

---

Realizzata con passione da **Edoardo Conforti** 
*(Ispirata alle lunghe serate a Burraco tra amici e nata per risolvere elegantemente il problema dei fogli di carta persi)*
