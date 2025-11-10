const CACHE_NAME = "berbagi-cerita-cache-v3";
const API_URL = "https://story-api.dicoding.dev/v1/stories";

const urlsToCache = [
  "/",
  "/index.html",
  "/app.webmanifest",
  "/images/logo.png",
  "/images/favicon.png",
];

const TILE_BLACKLIST = /tile\.openstreetmap\.org/;

// ==== IndexedDB Helper ====
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("berbagi-cerita-db", 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Stories cache
      if (!db.objectStoreNames.contains("stories")) {
        db.createObjectStore("stories", { keyPath: "id" });
      }

      // Outbox untuk pending stories
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", {
          keyPath: "localId",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==== INSTALL ====
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching app shell");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ==== ACTIVATE ====
self.addEventListener("activate", (event) => {
  console.log("[SW] Activated");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ==== FETCH ====
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (TILE_BLACKLIST.test(url.hostname)) {
    return;
  }

  if (request.url.startsWith(API_URL)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          cloned
            .json()
            .then((data) => {
              if (data.listStory) {
                saveStoriesToDB(data.listStory);
              }
            })
            .catch(() => {});

          return response;
        })
        .catch(() => {
          console.log("[SW] Offline, using cached stories");
          return getStoriesFromDB().then((stories) => {
            return new Response(
              JSON.stringify({
                error: false,
                message: "Offline mode",
                listStory: stories,
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 200,
              }
            );
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (request.method === "GET" && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          if (request.destination === "document") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

// ==== Save Stories to IndexedDB ====
function saveStoriesToDB(stories) {
  openDatabase()
    .then((db) => {
      const tx = db.transaction("stories", "readwrite");
      const store = tx.objectStore("stories");

      store.clear();

      stories.forEach((story) => {
        try {
          store.put(story);
        } catch (e) {
          console.warn("[SW] Failed to save story:", e);
        }
      });

      tx.oncomplete = () => {
        console.log("[SW] Stories saved to IndexedDB:", stories.length);
        db.close();
      };
    })
    .catch((error) => {
      console.error("[SW] IndexedDB error:", error);
    });
}

// ==== Get Stories from IndexedDB ====
function getStoriesFromDB() {
  return new Promise((resolve) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction("stories", "readonly");
        const store = tx.objectStore("stories");
        const request = store.getAll();

        request.onsuccess = () => {
          console.log(
            "[SW] Retrieved stories from IndexedDB:",
            request.result.length
          );
          resolve(request.result || []);
        };

        request.onerror = () => {
          console.error("[SW] Failed to get stories");
          resolve([]);
        };
      })
      .catch(() => {
        resolve([]);
      });
  });
}

// ==== Background Sync ====
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-new-stories") {
    console.log("[SW] 🔁 Background sync triggered");
    event.waitUntil(syncOfflineStories());
  }
});

async function syncOfflineStories() {
  try {
    const db = await openDatabase();
    const tx = db.transaction("outbox", "readonly");
    const store = tx.objectStore("outbox");

    const stories = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (stories.length === 0) {
      console.log("[SW] No stories to sync");
      return;
    }

    console.log(`[SW] Syncing ${stories.length} offline stories...`);

    for (const story of stories) {
      try {
        const { formData, token } = story;
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Upload failed: ${res.status}`);
        }

        console.log("[SW] ✅ Story synced successfully");
      } catch (err) {
        console.error("[SW] ❌ Failed to sync story:", err);
        return;
      }
    }

    const clearTx = db.transaction("outbox", "readwrite");
    clearTx.objectStore("outbox").clear();

    clearTx.oncomplete = () => {
      console.log("[SW] 🧹 Outbox cleared");
      db.close();
    };
  } catch (error) {
    console.error("[SW] Sync error:", error);
  }
}

// ==== Push Notification ====
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received");

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        title: "Notifikasi Baru",
        body: event.data.text(),
      };
    }
  }

  const title = data.title || "Storyapp";
  const options = {
    body: data.body || "Ada update baru!",
    icon: "/images/logo.png",
    badge: "/images/favicon.png",
    vibrate: [200, 100, 200],
    data: data.url || "/",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ==== Notification Click ====
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
