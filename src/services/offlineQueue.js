const DB_NAME = "billTrackerDB";
const DB_VERSION = 1;
const TX_STORE = "transactions";
const QUEUE_STORE = "pendingActions";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(TX_STORE)) {
        db.createObjectStore(TX_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    callback(store);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const offlineDB = {
  async getAllTransactions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TX_STORE, "readonly");
      const store = tx.objectStore(TX_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async saveTransaction(item) {
    return withStore(TX_STORE, "readwrite", (store) => store.put(item));
  },

  async deleteTransaction(id) {
    return withStore(TX_STORE, "readwrite", (store) => store.delete(id));
  },

  async addPendingAction(action) {
    return withStore(QUEUE_STORE, "readwrite", (store) => store.put(action));
  },

  async getPendingActions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async removePendingAction(id) {
    return withStore(QUEUE_STORE, "readwrite", (store) => store.delete(id));
  },
};