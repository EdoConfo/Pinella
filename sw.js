"use strict";
/* Pinella service worker.
   Strategy:
   - HTML / navigations: network-first with a short timeout, then cached copy
     (fresh when online, instant fallback offline or on a network that hangs).
   - Same-origin assets (versioned with ?v=, fonts self-hosted): cache-first.
   - Cross-origin: not handled (the app has no cross-origin dependencies).
   Bump VERSION (and the ?v= in ASSETS / index.html) whenever assets change. */
var VERSION = "103";
var NAV_TIMEOUT = 3000;
var CACHE = "pinella-" + VERSION;
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/styles.css?v=63",
  "./assets/js/main.js?v=103",
  "./assets/fonts/fraunces-latin.woff2",
  "./assets/fonts/fraunces-latin-ext.woff2",
  "./assets/fonts/hanken-grotesk-latin.woff2",
  "./assets/fonts/hanken-grotesk-latin-ext.woff2",
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
  if (url.origin !== self.location.origin) return;

  var isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") > -1;
  if (isHTML) {
    var cached = function () {
      return caches.match(req).then(function (m) { return m || caches.match("./index.html"); });
    };
    var network = fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      var finish = function (r) { if (!done && r) { done = true; resolve(r); } };
      // Slow / hanging network: serve the cached page, keep the fetch going to refresh the cache.
      var timer = setTimeout(function () { cached().then(finish); }, NAV_TIMEOUT);
      network.then(function (res) { clearTimeout(timer); finish(res); })
        .catch(function () {
          clearTimeout(timer);
          cached().then(function (m) { finish(m || Response.error()); });
        });
    }));
    e.waitUntil(network.catch(function () {}));
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
