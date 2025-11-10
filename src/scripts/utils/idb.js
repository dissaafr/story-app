const DB_NAME = "StoryDB";
const DB_VERSION = 2;
const STORE_NAME = "offlineStories";

let dbInstance = null;

function openDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("❌ IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("✅ IndexedDB connected");
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
        console.log("🗑️ Old store deleted");
      }

      const store = db.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });

      store.createIndex("createdAt", "createdAt", { unique: false });
      store.createIndex("description", "description", { unique: false });

      console.log("✅ Object store created:", STORE_NAME);
    };

    request.onblocked = () => {
      console.warn("⚠️ IndexedDB upgrade blocked. Close other tabs.");
      reject(new Error("Database upgrade blocked"));
    };
  });
}

export async function saveOfflineStory(data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    if (!data.createdAt) {
      data.createdAt = new Date().toISOString();
    }

    const request = store.add(data);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(
          "📦 Cerita offline disimpan:",
          data.description.substring(0, 30)
        );
        resolve(request.result);
      };
      request.onerror = () => {
        console.error("❌ Gagal simpan:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("❌ Error saveOfflineStory:", error);
    throw error;
  }
}

export async function getAllOfflineStories() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const stories = request.result || [];
        console.log(`📚 ${stories.length} cerita offline ditemukan`);
        resolve(stories);
      };

      request.onerror = () => {
        console.error("❌ Gagal get all:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("❌ Error getAllOfflineStories:", error);
    return [];
  }
}

export async function deleteOfflineStory(index) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const keysRequest = store.getAllKeys();

      keysRequest.onsuccess = () => {
        const keys = keysRequest.result;

        if (index >= 0 && index < keys.length) {
          const keyToDelete = keys[index];
          const deleteRequest = store.delete(keyToDelete);

          deleteRequest.onsuccess = () => {
            console.log("🗑️ Cerita offline dihapus:", keyToDelete);
            resolve();
          };

          deleteRequest.onerror = () => {
            console.error("❌ Gagal hapus:", deleteRequest.error);
            reject(deleteRequest.error);
          };
        } else {
          console.warn("⚠️ Index out of range:", index);
          resolve();
        }
      };

      keysRequest.onerror = () => {
        console.error("❌ Gagal get keys:", keysRequest.error);
        reject(keysRequest.error);
      };
    });
  } catch (error) {
    console.error("❌ Error deleteOfflineStory:", error);
    throw error;
  }
}

export async function clearOfflineStories() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        console.log("🧹 Semua cerita offline dihapus");
        resolve();
      };

      request.onerror = () => {
        console.error("❌ Gagal clear:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("❌ Error clearOfflineStories:", error);
    throw error;
  }
}

export async function hasOfflineStories() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.count();

      request.onsuccess = () => {
        const hasStories = request.result > 0;
        console.log(
          `📊 Has offline stories: ${hasStories} (${request.result})`
        );
        resolve(hasStories);
      };

      request.onerror = () => {
        console.error("❌ Gagal count:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("❌ Error hasOfflineStories:", error);
    return false; 
  }
}


export async function getOfflineStoriesCount() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("❌ Gagal count:", request.error);
        resolve(0);
      };
    });
  } catch (error) {
    console.error("❌ Error getOfflineStoriesCount:", error);
    return 0;
  }
}

export async function initDB() {
  try {
    await openDB();
    console.log("✅ IndexedDB initialized");
    return true;
  } catch (error) {
    console.error("❌ Failed to init IndexedDB:", error);
    return false;
  }
}

if (typeof window !== "undefined") {
  initDB().catch(console.error);
}
