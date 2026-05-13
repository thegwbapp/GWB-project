const CACHE_NAME = "beherdaily-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
  "/manifest.json",
  "/apple-touch-icon.png",
  "/favicon.svg"
];

// Install — cache all assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener("fetch", event => {
  // Skip non-GET and external requests (Supabase, Cloudinary, Anthropic)
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!url.origin.includes("beherdaily") && !url.origin.includes("localhost")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match("/index.html"));
    })
  );
});

// Push notifications
self.addEventListener("push", event => {
  const data = event.data?.json() || {};
  const title = data.title || "Be Her Daily";
  const options = {
    body: data.body || "She's waiting for you. Check in today.",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
    actions: [
      { action: "checkin", title: "Check In Now" },
      { action: "dismiss", title: "Later" }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "checkin" || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
  }
});
