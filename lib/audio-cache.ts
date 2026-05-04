const DB_NAME = "english-shadow-coach-audio";
const DB_VERSION = 1;
const STORE_NAME = "assistant-audio";

type CachedAudioRecord = {
  key: string;
  blob: Blob;
  createdAt: string;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openAudioCache() {
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedAudioBlob(key: string) {
  const db = await openAudioCache();

  if (!db) {
    return null;
  }

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const record = request.result as CachedAudioRecord | undefined;
      resolve(record?.blob ?? null);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function putCachedAudioBlob(key: string, blob: Blob) {
  const db = await openAudioCache();

  if (!db) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put({
      key,
      blob,
      createdAt: new Date().toISOString(),
    } satisfies CachedAudioRecord);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function deleteCachedAudioBlob(key: string) {
  const db = await openAudioCache();

  if (!db) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
