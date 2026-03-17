const CACHE_NAME = "smile-artist-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-512.png",
];

// Smile Artist – Service worker for caching and push notifications
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Use Network-First for critical entry points to avoid serving outdated index.html
  // with missing or broken hash links to JS/CSS chunks.
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/manifest.json") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Use Cache-First for other static assets defined in ASSETS
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  } else {
    // Default Network-First for everything else
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error("Failed to parse push data as JSON", e);
    // Fallback if data is raw text
    data = { title: "Smile Artist", body: event.data ? event.data.text() : "New notification" };
  }

  const title = data.title || "Smile Artist";
  const options = {
    body: data.body || "A safe, supportive space for your creative expression",
    icon: data.icon || "/icons/notification-icon-192.png",
    badge: data.badge || "/icons/badge-72.png",
    vibrate: [200, 100, 200],
    requireInteraction: data.type === "chat" || data.type === "buddy_request",
    data: {
      url: data.url || "/",
      type: data.type
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // 1. Try to find an existing window that is already loading the same origin
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && "focus" in client) {
          // Send message or navigate directly if possible
          // For simple redirects, let's navigate the existing tab if it's on the home route
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      
      // 2. If no window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
