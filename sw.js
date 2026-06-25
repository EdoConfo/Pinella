"use strict";
/* Pinella service worker.
   Strategy:
   - HTML / navigations: network-first (always fresh online, cached copy offline).
   - Same-origin assets (versioned with ?v=): cache-first.
   - Cross-origin (Google Fonts): straight to network; CSS has system fallbacks offline.
   Bump VERSION (and the ?v= in ASSETS / index.html) whenever assets change. */
var VERSION = "32";
var CACHE = "pinella-" + VERSION;
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/styles.css?v=32",
  "./assets/js/main.js?v=32",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png",
  "./assets/img/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return; // fonts etc. -> network

  var isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") > -1;
  if (isHTML) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match("./index.html"); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
