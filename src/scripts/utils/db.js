import { openDB } from 'idb';

const DB_NAME = 'berbagi-cerita-db';
const DB_VERSION = 1;
const STORE_NAME = 'stories';
const OUTBOX_STORE = 'outbox';

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
      db.createObjectStore(OUTBOX_STORE, { autoIncrement: true });
    }
  },
});

export const StoryDB = {
  async getAll() {
    return (await dbPromise).getAll('stories');
  },
  async saveAll(stories) {
    const db = await dbPromise;
    const tx = db.transaction('stories', 'readwrite');
    await Promise.all(stories.map((story) => tx.store.put(story)));
    await tx.done;
  },
  async addOutbox(story) {
    const db = await dbPromise;
    const tx = db.transaction('outbox', 'readwrite');
    await tx.store.add(story);
    await tx.done;
  },
  async getOutbox() {
    return (await dbPromise).getAll('outbox');
  },
  async clearOutbox() {
    const db = await dbPromise;
    const tx = db.transaction('outbox', 'readwrite');
    await tx.store.clear();
    await tx.done;
  },
};
